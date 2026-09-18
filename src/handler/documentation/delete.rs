use std::fs;
use std::path::Path;
use chrono::Utc;
use mongodb::bson::doc;
use serde::Deserialize;
use crate::{Model, DOCS_ROOT};
use crate::BuiltIns::mongo::MongoDB;
use crate::Model::Account::AccountRole;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::response::Response;
use actix_web::{web, Error, HttpRequest, HttpResponse};

// Takes a doc entry down.
//
// The row is soft-deleted the way the rest of this codebase does it, but the
// unpacked site under DOCS_ROOT/<uuid> is removed for real. It has to be:
// handler/documentation/get.rs serves those files straight off disk by uuid
// and never asks the database anything, so a row marked deleted with its
// files still in place would go on being readable by anyone holding the link.
//
// That makes this one-way. A soft-deleted entry keeps its name, description
// and view count, but the site itself is gone and bringing the entry back
// would mean uploading the zip again.

#[derive(Debug, Deserialize)]
pub struct PathVariables {
    uuid: String,
}

pub async fn task(
    req: HttpRequest,
    path: web::Path<PathVariables>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let db = MongoDB.connect();
    let collection = db.collection::<Model::Documentation::Documentation>("documentation");

    let now = Utc::now().timestamp_millis();

    let result = collection
        .update_one(
            doc! { "uuid": &path.uuid, "deleted_at": null },
            doc! { "$set": { "deleted_at": now, "deleted_by": "admin" } },
        )
        .await;

    let update = match result {
        Ok(r) => r,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    if update.matched_count == 0 {
        return Ok(Response::not_found("Documentation not found"));
    }

    // The uuid came out of the path, so it is checked against the shape the
    // server generates before it is joined onto a filesystem path — a stray
    // "../" in there would otherwise point this at a directory of its own
    // choosing.
    if !is_uuid_like(&path.uuid) {
        log::error!("refusing to remove docs directory for {:?}", path.uuid);
        return Ok(Response::bad_request("Malformed documentation id"));
    }

    let dir = Path::new(DOCS_ROOT).join(&path.uuid);
    if dir.exists() {
        if let Err(error) = fs::remove_dir_all(&dir) {
            // The row is already marked deleted and the entry has left every
            // list. Files left behind are a disk problem to clear up by hand,
            // not a reason to tell the caller the delete failed.
            log::error!("failed to remove {:?}: {}", dir, error);
        }
    }

    Ok(HttpResponse::Ok().content_type("application/json").json(
        Response { message: "Deleted".to_string() }
    ))
}

// Uuid::now_v7().to_string() shape: hex and hyphens, nothing else. Rejecting
// anything outside it keeps path separators and dot segments out.
pub fn is_uuid_like(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 64
        && value.chars().all(|c| c.is_ascii_hexdigit() || c == '-')
}

#[cfg(test)]
mod tests {
    use super::is_uuid_like;

    #[test]
    fn real_ids_pass() {
        assert!(is_uuid_like("0193c2f1-8a4e-7c3b-9f2a-1d4e5f6a7b8c"));
        assert!(is_uuid_like("abcdef0123456789"));
    }

    #[test]
    fn anything_that_could_leave_the_docs_directory_is_refused() {
        assert!(!is_uuid_like(".."));
        assert!(!is_uuid_like("../../etc"));
        assert!(!is_uuid_like("a/b"));
        assert!(!is_uuid_like("a\\b"));
        assert!(!is_uuid_like("uuid with space"));
        assert!(!is_uuid_like(""));
    }
}
