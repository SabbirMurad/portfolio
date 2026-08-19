use actix_web::{Error, HttpRequest, HttpResponse};
use serde_json::json;

use crate::Middleware::Auth::{require_cli, AccessRequirement};

/// Confirms the token in ~/.config is still good, and says what it can do.
pub async fn task(req: HttpRequest) -> Result<HttpResponse, Error> {
    let user = require_cli(&req, AccessRequirement::AnyToken).await?;

    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .json(json!({
            "user_id": user.user_id,
            "role": user.role,
        })))
}
