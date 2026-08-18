use serde::{Deserialize, Serialize};
use mongodb::bson::doc;
use crate::Model::Project::Project;
use crate::Model::Account::AccountRole;
use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::response::Response;
use actix_web::{web, Error, HttpRequest, HttpResponse};

#[derive(Debug, Deserialize)]
pub struct PathVariables {
    uuid: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RequestBody {
    featured: bool,
}

// Whether a project shows up in the projects grid on the home page — the
// only field the dashboard's project list needs to edit in place.
pub async fn task(
    req: HttpRequest,
    path: web::Path<PathVariables>,
    form_data: web::Json<RequestBody>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let db = MongoDB.connect();
    let collection = db.collection::<Project>("project");

    let result = collection.update_one(
        doc! { "uuid": &path.uuid, "deleted_at": null },
        doc! { "$set": { "featured": form_data.featured } },
    ).await;

    let update_result = match result {
        Ok(r) => r,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    if update_result.matched_count == 0 {
        return Ok(Response::not_found("Project not found"));
    }

    Ok(HttpResponse::Ok().content_type("application/json").json(
        Response { message: "Updated".to_string() }
    ))
}
