use futures_util::TryStreamExt;
use mongodb::bson::doc;

use actix_web::{Error, HttpRequest, HttpResponse};

use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access, require_cli, AccessRequirement};
use crate::Model::Account::AccountRole;
use crate::Model::Shell::ShellBundle;
use crate::utils::response::Response;

/// The bundles this server can run, newest first.
///
/// The one shell route that takes either credential: the dashboard lists them
/// to render the Shell tab, and `ct shell list` needs the same read from a
/// terminal. Reading names and descriptions executes nothing, so it does not
/// warrant the stricter gate the run routes use — the session is tried first
/// because a browser call carries fetch metadata that require_cli refuses.
pub async fn task(req: HttpRequest) -> Result<HttpResponse, Error> {
    if require_access(&req, AccessRequirement::Role(AccountRole::Administrator)).is_err() {
        require_cli(&req, AccessRequirement::Role(AccountRole::Administrator)).await?;
    }

    let db = MongoDB.connect();
    let collection = db.collection::<ShellBundle>("shell_bundle");

    let cursor = collection
        .find(doc! { "deleted_at": null })
        .sort(doc! { "created_at": -1 })
        .await;

    let cursor = match cursor {
        Ok(c) => c,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let bundles: Vec<ShellBundle> = match cursor.try_collect().await {
        Ok(v) => v,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .json(bundles))
}
