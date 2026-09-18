use std::fs;
use std::path::{Path, PathBuf};
use chrono::Utc;
use mongodb::bson::doc;
use serde::{Deserialize, Serialize};
use crate::{Model, DOCS_ROOT};
use crate::BuiltIns::mongo::MongoDB;
use crate::Model::Account::AccountRole;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::{mkdocs, response::Response};
use crate::Handler::Documentation::Delete::is_uuid_like;
use actix_web::{web, Error, HttpRequest, HttpResponse};

// Edits an entry: the name, description and tags always, and the built site
// itself when a new zip comes with the request.
//
// `file` is optional — an empty vector means "leave the site alone", which is
// the common case of fixing a typo in a description. When one is sent it is a
// whole new mkdocs build replacing the old one.
//
// The replacement is unpacked beside the live directory and only swapped in
// once it has succeeded. Unpacking over the top would mean a bad zip takes the
// published site down with it, and would leave files from the old build lying
// under the new one where nothing removes them.

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBody {
    name: String,
    description: String,
    tags: Vec<String>,
    #[serde(default)]
    file: Vec<u8>,
}

#[derive(Debug, Deserialize)]
pub struct PathVariables {
    uuid: String,
}

#[derive(Debug, Serialize)]
struct ResponseBody {
    uuid: String,
    name: String,
    description: String,
    tags: Vec<String>,
    // Whether this request replaced the built site, so the dashboard can say
    // which of the two things it just did.
    site_replaced: bool,
}

pub async fn task(
    req: HttpRequest,
    path: web::Path<PathVariables>,
    form_data: web::Json<RequestBody>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let name = form_data.name.trim().to_string();
    let description = form_data.description.trim().to_string();

    if name.is_empty() {
        return Ok(Response::bad_request("Title is required"));
    }
    if description.is_empty() {
        return Ok(Response::bad_request("Description is required"));
    }
    if !is_uuid_like(&path.uuid) {
        return Ok(Response::bad_request("Malformed documentation id"));
    }

    let db = MongoDB.connect();
    let collection = db.collection::<Model::Documentation::Documentation>("documentation");

    let existing = collection
        .find_one(doc! { "uuid": &path.uuid, "deleted_at": null })
        .await;

    match existing {
        Ok(Some(_)) => {}
        Ok(None) => return Ok(Response::not_found("Documentation not found")),
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    }

    // Create enforces unique names; an edit has to as well, without the entry
    // colliding with itself.
    let clash = collection
        .find_one(doc! {
            "name": &name,
            "uuid": { "$ne": &path.uuid },
            "deleted_at": null,
        })
        .await;

    match clash {
        Ok(Some(_)) => return Ok(Response::bad_request("Document name already exist")),
        Ok(None) => {}
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    }

    let replacing_site = !form_data.file.is_empty();
    let live_dir = Path::new(DOCS_ROOT).join(&path.uuid);

    // Unpack first, write the row second: a failed unpack should leave both
    // the site and the entry as they were.
    let mut staged: Option<PathBuf> = None;

    if replacing_site {
        let incoming = Path::new(DOCS_ROOT).join(format!("{}.incoming", &path.uuid));
        let _ = fs::remove_dir_all(&incoming);

        if let Err(error) = mkdocs::unpack(&form_data.file, &incoming, &path.uuid) {
            log::error!("{}", error);
            let _ = fs::remove_dir_all(&incoming);
            return Ok(Response::bad_request(&error));
        }

        staged = Some(incoming);
    }

    let now = Utc::now().timestamp_millis();
    let result = collection
        .update_one(
            doc! { "uuid": &path.uuid, "deleted_at": null },
            doc! { "$set": {
                "name": &name,
                "description": &description,
                "tags": &form_data.tags,
                "updated_at": now,
            }},
        )
        .await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        if let Some(incoming) = &staged {
            let _ = fs::remove_dir_all(incoming);
        }
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    // The swap: the old build moves aside, the new one takes its place, and
    // the old one is dropped. Keeping the retired copy until the rename has
    // succeeded means a failure here leaves a readable site either way.
    if let Some(incoming) = staged {
        let retired = Path::new(DOCS_ROOT).join(format!("{}.retired", &path.uuid));
        let _ = fs::remove_dir_all(&retired);

        let moved_away = if live_dir.exists() {
            match fs::rename(&live_dir, &retired) {
                Ok(()) => true,
                Err(error) => {
                    log::error!("failed to move {:?} aside: {}", live_dir, error);
                    let _ = fs::remove_dir_all(&incoming);
                    return Ok(Response::internal_server_error(
                        "Saved the entry, but could not replace the site",
                    ));
                }
            }
        } else {
            false
        };

        if let Err(error) = fs::rename(&incoming, &live_dir) {
            log::error!("failed to move {:?} into place: {}", incoming, error);
            // Put the old build back rather than leaving the entry pointing at
            // nothing.
            if moved_away {
                let _ = fs::rename(&retired, &live_dir);
            }
            let _ = fs::remove_dir_all(&incoming);
            return Ok(Response::internal_server_error(
                "Saved the entry, but could not replace the site",
            ));
        }

        let _ = fs::remove_dir_all(&retired);
    }

    Ok(HttpResponse::Ok().content_type("application/json").json(ResponseBody {
        uuid: path.uuid.clone(),
        name,
        description,
        tags: form_data.tags.clone(),
        site_replaced: replacing_site,
    }))
}
