/*
 * Upload a shell bundle from the dashboard.
 *
 * The zip goes over the wire as a JSON array of bytes, matching how
 * handler/documentation/create.rs takes its doc-site zip — the dashboard uses
 * one upload path for both.
 *
 * What lands on disk here is scripts this server will later run as root, so
 * the gate is the same Administrator session every other route in this module
 * uses, and the name is validated before it is ever joined to a path.
 */
use std::fs;

use chrono::Utc;
use mongodb::bson::doc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use actix_web::{web, Error, HttpRequest, HttpResponse};

use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::Model::Account::AccountRole;
use crate::Model::Shell::ShellBundle;
use crate::utils::{archive, response::Response};

use super::{is_valid_bundle, list_targets, shell_root};

/// A bundle is a handful of scripts.
const LIMITS: archive::Limits = archive::Limits {
    max_entries: 500,
    max_total_bytes: 16 * 1024 * 1024,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBody {
    name: String,
    description: String,
    file: Vec<u8>,
}

pub async fn task(
    req: HttpRequest,
    form_data: web::Json<RequestBody>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let name = form_data.name.trim().to_lowercase();
    let description = form_data.description.trim().to_string();

    if name.is_empty() {
        return Ok(Response::bad_request("Name is required"));
    }
    if !is_valid_bundle(&name) {
        return Ok(Response::bad_request(
            "Name may only contain lowercase letters, digits, hyphens and underscores",
        ));
    }
    if description.is_empty() {
        return Ok(Response::bad_request("Description is required"));
    }
    if form_data.file.is_empty() {
        return Ok(Response::bad_request("Zip file is required"));
    }

    let root = match shell_root() {
        Ok(root) => root,
        Err(error) => {
            log::error!("{}", error);
            return Ok(Response::internal_server_error(&error));
        }
    };
    let target_dir = root.join(&name);

    let db = MongoDB.connect();
    let collection = db.collection::<ShellBundle>("shell_bundle");

    // The name is the directory *and* the URL, so it has to be unique. Checked
    // against the filesystem too: a directory could exist from a previous run
    // whose document was removed.
    let existing = collection
        .find_one(doc! { "name": &name, "deleted_at": null })
        .await;

    match existing {
        Ok(Some(_)) => return Ok(Response::bad_request("A bundle with that name already exists")),
        Ok(None) => {}
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    }

    if target_dir.exists() {
        return Ok(Response::bad_request(
            "A directory with that name is already on disk",
        ));
    }

    if let Err(error) = archive::unzip(&form_data.file, &target_dir, &LIMITS) {
        let _ = fs::remove_dir_all(&target_dir);
        return Ok(Response::bad_request(&error));
    }

    // Without a main.sh the run routes have nothing to call, so this is not a
    // bundle — say so now rather than 404ing later from /targets.
    if !target_dir.join("main.sh").is_file() {
        let _ = fs::remove_dir_all(&target_dir);
        return Ok(Response::bad_request(
            "The archive has no main.sh at its root",
        ));
    }

    // Read the targets once, here, so the dashboard doesn't shell out on every
    // page load. A bundle whose --list fails still uploads: it may need root
    // for something this process doesn't have, and that is a run-time problem.
    let targets = list_targets(&target_dir).unwrap_or_default();

    let bundle = ShellBundle {
        uuid: Uuid::now_v7().to_string(),
        name: name.clone(),
        description,
        targets,
        created_at: Utc::now().timestamp_millis(),
        created_by: "admin".to_string(),
        deleted_at: None,
        deleted_by: None,
    };

    if let Err(error) = collection.insert_one(bundle.clone()).await {
        log::error!("{:?}", error);
        // Nothing should be left on disk under a name the database doesn't know.
        let _ = fs::remove_dir_all(&target_dir);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .json(bundle))
}
