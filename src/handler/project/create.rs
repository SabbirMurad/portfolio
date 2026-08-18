use uuid::Uuid;
use chrono::Utc;
use mongodb::bson::doc;
use serde::{Serialize, Deserialize};
use crate::Model::Project::Project;
use crate::Model::Account::AccountRole;
use crate::BuiltIns::mongo::MongoDB;
use crate::builtins::sqlite;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::response::Response;
use actix_web::{web, Error, HttpRequest, HttpResponse};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBody {
    title: String,
    subtitle: String,
    description: String,
    tags: Vec<String>,
    // From a prior POST /api/image/upload — this endpoint never takes the
    // image bytes directly.
    image_id: String,
}

#[derive(Debug, Serialize)]
struct ResponseBody {
    uuid: String,
    title: String,
}

pub async fn task(
    req: HttpRequest,
    form_data: web::Json<RequestBody>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let title = form_data.title.trim().to_string();
    let subtitle = form_data.subtitle.trim().to_string();
    let description = form_data.description.trim().to_string();
    let image_id = form_data.image_id.trim().to_string();

    if title.is_empty() {
        return Ok(Response::bad_request("Title is required"));
    }
    if description.is_empty() {
        return Ok(Response::bad_request("Description is required"));
    }
    if image_id.is_empty() {
        return Ok(Response::bad_request("Thumbnail image is required"));
    }

    // The image_id has to point at something real — catches a stale/typo'd
    // id before it ends up referenced by a live project.
    let db_conn = match sqlite::connect(sqlite::DBF::IMG) {
        Ok(conn) => conn,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };
    let image_exists: Result<i64, _> = db_conn.query_row(
        "SELECT 1 FROM image WHERE uuid = ?1",
        [&image_id],
        |row| row.get(0),
    );
    if image_exists.is_err() {
        return Ok(Response::bad_request("Unknown image_id — upload the thumbnail first"));
    }

    let db = MongoDB.connect();
    let collection = db.collection::<Project>("project");

    let existing = collection.find_one(doc! { "title": &title, "deleted_at": null }).await;
    match existing {
        Ok(Some(_)) => {
            return Ok(Response::bad_request("A project with this title already exists"));
        }
        Ok(None) => {}
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    }

    let uuid = Uuid::now_v7().to_string();
    let project = Project {
        uuid: uuid.clone(),
        title: title.clone(),
        subtitle,
        description,
        tags: form_data.tags.clone(),
        image_id,
        featured: false,
        created_at: Utc::now().timestamp_millis(),
        created_by: "admin".to_string(),
        deleted_at: None,
        deleted_by: None,
    };

    let result = collection.insert_one(project).await;
    if let Err(error) = result {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    Ok(HttpResponse::Ok().content_type("application/json").json(ResponseBody { uuid, title }))
}
