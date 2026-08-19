use serde::{Deserialize, Serialize};
use mongodb::bson::doc;
use crate::Model::Shell::ShellBundle;
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
    public_run: bool,
}

/// Open a bundle to ordinary accounts, or close it again.
///
/// Administrator-only, and from the dashboard rather than the CLI: this is the
/// switch that decides whether someone who merely registered can execute root
/// scripts on the host with `ct shell run`. It stays off until an admin turns
/// it on for a specific bundle — see `authorize` in src/handler/shell.rs for
/// where it is enforced.
pub async fn task(
    req: HttpRequest,
    path: web::Path<PathVariables>,
    form_data: web::Json<RequestBody>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let db = MongoDB.connect();
    let collection = db.collection::<ShellBundle>("shell_bundle");

    let result = collection.update_one(
        doc! { "uuid": &path.uuid, "deleted_at": null },
        doc! { "$set": { "public_run": form_data.public_run } },
    ).await;

    let update_result = match result {
        Ok(r) => r,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    if update_result.matched_count == 0 {
        return Ok(Response::not_found("Bundle not found"));
    }

    Ok(HttpResponse::Ok().content_type("application/json").json(
        Response { message: "Updated".to_string() }
    ))
}
