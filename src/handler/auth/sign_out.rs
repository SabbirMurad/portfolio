use mongodb::bson::doc;
use actix_session::Session;
use serde::{ Serialize, Deserialize };
use crate::utils::response::Response;
use actix_web::{Error, HttpResponse};
use super::expired_auth_cookie;

#[derive(Debug, Deserialize, Serialize, Clone)]
struct PostData { fcm_token: String }


pub async fn task(actix_session: Session) -> Result<HttpResponse, Error> {

    actix_session.purge();

    // Clear the httpOnly auth cookies the API middleware reads
    // (src/middleware/auth.rs `require_access`) — JS can't remove these itself.
    Ok(
        HttpResponse::Ok()
        .cookie(expired_auth_cookie("access_token"))
        .cookie(expired_auth_cookie("refresh_token"))
        .content_type("application/json")
        .json(Response { message: "Successfully Signed Out".to_string() })
    )
}