use mongodb::bson::{doc, Bson};
use serde::{Serialize, Deserialize};
use crate::Model::Project::Project;
use crate::Model::Account::AccountRole;
use crate::BuiltIns::mongo::MongoDB;
use crate::builtins::sqlite;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::response::Response;
use super::create::{optional, valid_accent, valid_link};
use actix_web::{web, Error, HttpRequest, HttpResponse};

#[derive(Debug, Deserialize)]
pub struct PathVariables {
    uuid: String,
}

// The same fields the create form sends. The whole card is sent on save, so
// whatever is in the form is what gets stored.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBody {
    title: String,
    subtitle: String,
    description: String,
    tags: Vec<String>,
    image_id: String,
    #[serde(default)]
    link: Option<String>,
    #[serde(default)]
    accent: Option<String>,
    #[serde(default)]
    year: Option<String>,
}

fn to_bson(value: Option<String>) -> Bson {
    value.map(Bson::String).unwrap_or(Bson::Null)
}

// Edits a project card. `slug` is left alone on purpose, even when the title
// changes: /projects/<slug> may already be shared or indexed, and a rename
// shouldn't break that URL. `featured` and `details_id` have their own
// endpoints.
pub async fn task(
    req: HttpRequest,
    path: web::Path<PathVariables>,
    form_data: web::Json<RequestBody>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let title = form_data.title.trim().to_string();
    let subtitle = form_data.subtitle.trim().to_string();
    let description = form_data.description.trim().to_string();
    let image_id = form_data.image_id.trim().to_string();
    let link = optional(&form_data.link);
    let accent = optional(&form_data.accent);
    let year = optional(&form_data.year);
    let tags: Vec<String> = form_data
        .tags
        .iter()
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .collect();

    if title.is_empty() {
        return Ok(Response::bad_request("Title is required"));
    }
    if description.is_empty() {
        return Ok(Response::bad_request("Description is required"));
    }
    if image_id.is_empty() {
        return Ok(Response::bad_request("Thumbnail image is required"));
    }
    if link.as_deref().is_some_and(|l| !valid_link(l)) {
        return Ok(Response::bad_request("Link must start with http://, https:// or /"));
    }
    if accent.as_deref().is_some_and(|a| !valid_accent(a)) {
        return Ok(Response::bad_request("Accent must be a hex colour like #DE4520"));
    }

    let db = MongoDB.connect();
    let collection = db.collection::<Project>("project");

    let current = match collection
        .find_one(doc! { "uuid": &path.uuid, "deleted_at": null })
        .await
    {
        Ok(Some(project)) => project,
        Ok(None) => return Ok(Response::not_found("Project not found")),
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    // Only a new thumbnail needs checking; the current one was checked when
    // it was first set.
    if image_id != current.image_id {
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
    }

    // Titles stay unique among live projects, as on create; this one doesn't
    // count against itself.
    let clash = collection
        .find_one(doc! {
            "title": &title,
            "deleted_at": null,
            "uuid": { "$ne": &path.uuid },
        })
        .await;
    match clash {
        Ok(Some(_)) => {
            return Ok(Response::bad_request("A project with this title already exists"));
        }
        Ok(None) => {}
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    }

    let result = collection
        .update_one(
            doc! { "uuid": &path.uuid, "deleted_at": null },
            doc! { "$set": {
                "title": &title,
                "subtitle": &subtitle,
                "description": &description,
                "tags": &tags,
                "image_id": &image_id,
                "link": to_bson(link),
                "accent": to_bson(accent),
                "year": to_bson(year),
            }},
        )
        .await;

    match result {
        Ok(r) if r.matched_count == 0 => Ok(Response::not_found("Project not found")),
        Ok(_) => Ok(HttpResponse::Ok().content_type("application/json").json(
            Response { message: "Updated".to_string() }
        )),
        Err(error) => {
            log::error!("{:?}", error);
            Ok(Response::internal_server_error(&error.to_string()))
        }
    }
}
