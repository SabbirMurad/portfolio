use chrono::Utc;
use mongodb::bson::doc;

use actix_web::{Error, HttpRequest, HttpResponse};
use serde_json::json;

use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{hash_token, require_cli, AccessRequirement};
use crate::Model::CliToken::CliToken;
use crate::utils::response::Response;

/// Revoke the token that made this call.
///
/// Revoking rather than deleting: the row is what a later "when was this
/// machine last signed in" question is answered from, and require_cli filters
/// on revoked_at being null anyway.
pub async fn task(req: HttpRequest) -> Result<HttpResponse, Error> {
    // Going through the gate first means an already-invalid token gets the
    // same clear message it would anywhere else.
    require_cli(&req, AccessRequirement::AnyToken).await?;

    let token = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .map(|t| t.trim().to_string())
        .unwrap_or_default();

    let db = MongoDB.connect();
    let collection = db.collection::<CliToken>("cli_token");

    let result = collection
        .update_one(
            doc! { "token_hash": hash_token(&token), "revoked_at": null },
            doc! { "$set": { "revoked_at": Utc::now().timestamp_millis() } },
        )
        .await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .json(json!({ "revoked": true })))
}
