use crate::utils::response::Response;
use serde::{ Serialize, Deserialize };
use actix_web::{web, Error, HttpRequest, HttpResponse };
use serde_json::json;
use crate::BuiltIns::{jwt, mongo::MongoDB};
use super::{auth_access_cookie, resolve_role};

// The mobile app would send the refresh token in the body; the browser
// dashboard sends it as an httpOnly cookie instead (unreadable by JS, and
// the only thing it needs to keep — see assets/jsx/sign_in.jsx, which never
// touches localStorage). Body takes priority when present.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostData {
    #[serde(default)]
    refresh_token: String,
}

pub async fn task(
    req: HttpRequest,
    form_data: Option<web::Json<PostData>>
) -> Result<HttpResponse, Error> {
    let from_body = form_data
        .map(|b| b.refresh_token.trim().to_string())
        .filter(|s| !s.is_empty());
    let is_browser = from_body.is_none();

    let refresh_token = match from_body.or_else(|| {
        req.cookie("refresh_token")
            .map(|c| c.value().trim().to_string())
            .filter(|t| !t.is_empty())
    }) {
        Some(t) => t,
        None => return Ok(Response::bad_request("Refresh token is required")),
    };

    let result = jwt::refresh_token::status(&refresh_token);

    if let Err(error) = result {
        log::error!("{:?}",error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let option = result.unwrap();
    if let None = option {
        return Ok(Response::forbidden("status not found on this token"));
    }

    let status = option.unwrap();

    if let jwt::Status::Blocked = status {
        return Ok(Response::forbidden("this token is blocked"));
    }

    let user_id = match jwt::refresh_token::subject(&refresh_token) {
        Ok(id) => id,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::unauthorized("Invalid refresh token"));
        }
    };

    // The refresh token carries no role, so it has to be looked up fresh —
    // relevant if an admin's role changed since this token was issued.
    let db = MongoDB.connect();
    let role = match resolve_role(&db, &user_id).await {
        Some(r) => r,
        None => return Ok(Response::unauthorized("Invalid refresh token")),
    };

    let access_token = jwt::access_token::generate_default(&user_id, role);

    if is_browser {
        return Ok(
            HttpResponse::Ok()
            .cookie(auth_access_cookie(access_token))
            .content_type("application/json")
            .json(json!({ "message": "Access token refreshed" }))
        );
    }

    Ok(
        HttpResponse::Ok()
        .content_type("application/json")
        .json(json!({ "access_token": access_token }))
    )
}