use std::fs;
use uuid::Uuid;
use chrono::Utc;
use mongodb::bson::doc;
use crate::{Model, DOCS_ROOT};
use std::path::Path;
use crate::BuiltIns::mongo::MongoDB;
use crate::utils::{mkdocs, response::Response};
use serde::{ Serialize, Deserialize };
use crate::Model::Account::AccountRole;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use actix_web::{web, Error, HttpRequest, HttpResponse, Result};


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBody {
    name: String,
    description: String,
    tags: Vec<String>,
    file: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ResponseBody {
    uuid: String,
    name: String,
}


pub async fn task(
    req: HttpRequest,
    form_data: web::Json<RequestBody>,
) -> Result<HttpResponse, Error> {
    // Same middleware every authenticated API route uses (src/middleware/auth.rs),
    // reading the access_token cookie the dashboard sets at sign-in. Without this,
    // anyone could create documentation entries — there is no other access control.
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let doc_name = form_data.name.trim().to_string();
    let description = form_data.description.trim().to_string();

    if doc_name.is_empty() {
        return Ok(Response::bad_request("Title is required"));
    }
    if description.is_empty() {
        return Ok(Response::bad_request("Description is required"));
    }
    if form_data.file.is_empty() {
        return Ok(Response::bad_request("Zip file is required"));
    }

    /* DATABASE ACID SESSION INIT */
    let (db, mut session) = MongoDB.connect_acid().await;
    if let Err(error) = session.start_transaction().await {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    //Checking if the document name already exist
    let doc_id = Uuid::now_v7().to_string();
    let now = Utc::now().timestamp_millis();

    let collection = db.collection::
    <Model::Documentation::Documentation>("documentation");

    let result = collection.find_one(
        doc!{"name": &doc_name},
    ).await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    if let Some(_) = result.unwrap() {
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::bad_request("Document name already exist"));
    }

    // Creating the document data
    let document = Model::Documentation::Documentation {
        uuid: doc_id.clone(),
        name: doc_name.clone(),
        description: description.clone(),
        tags: form_data.tags.clone(),
        featured: false,
        view_count: 0,
        created_at: now,
        created_by: "admin".to_string(),
        deleted_at: None,
        deleted_by: None,
    };

    let result = collection.insert_one(document).await;
    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    // Unpacked under the uuid, not the name: the name is user-editable and can
    // contain anything, while /documentation/{uuid}/ is a stable URL. See
    // utils/mkdocs.rs for what "unpack" does beyond extracting — stripping the
    // `site/` wrapper, rebasing the URLs mkdocs baked in from site_url, and
    // giving the root an index.html when the build has none.
    let target_dir = Path::new(DOCS_ROOT).join(&doc_id);

    if let Err(error) = mkdocs::unpack(&form_data.file, &target_dir, &doc_id) {
        log::error!("{}", error);
        // Nothing should be left half-unpacked under a uuid the database is
        // about to forget about.
        let _ = fs::remove_dir_all(&target_dir);
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::bad_request(&error));
    }

    /* DATABASE ACID COMMIT */
    if let Err(error) = session.commit_transaction().await {
        log::error!("{:?}", error);
        let _ = fs::remove_dir_all(&target_dir);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let res = ResponseBody {
        uuid: doc_id.clone(),
        name: doc_name.clone(),
    };

    Ok(HttpResponse::Ok().content_type("application/json").json(res))
}