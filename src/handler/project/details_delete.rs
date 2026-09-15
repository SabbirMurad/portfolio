use chrono::Utc;
use mongodb::bson::doc;
use serde::Deserialize;
use crate::Model::Project::Project;
use crate::Model::Account::AccountRole;
use crate::Model::ProjectDetails::ProjectDetails;
use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::response::Response;
use actix_web::{web, Error, HttpRequest, HttpResponse};

// Takes the detail page away: the row is soft-deleted the way everything else
// here is, and the project's details_id is unset so the card goes back to
// linking straight out. The slug stays on the project — it costs nothing, and
// keeping it means a page that is restored later comes back at the same URL.

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
    let now = Utc::now().timestamp_millis();

    let cleared = db
        .collection::<ProjectDetails>("project_details")
        .update_many(
            doc! { "project_uuid": &path.uuid, "deleted_at": null },
            doc! { "$set": { "deleted_at": now, "deleted_by": "admin" } },
        )
        .await;

    if let Err(error) = cleared {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let unset = db
        .collection::<Project>("project")
        .update_one(
            doc! { "uuid": &path.uuid, "deleted_at": null },
            doc! { "$set": { "details_id": null } },
        )
        .await;

    let result = match unset {
        Ok(r) => r,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    if result.matched_count == 0 {
        return Ok(Response::not_found("Project not found"));
    }

    Ok(HttpResponse::Ok().content_type("application/json").json(
        Response { message: "Detail page removed".to_string() }
    ))
}
