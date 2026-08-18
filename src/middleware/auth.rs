/*
 * API auth gate — ported from postura_rust's src/middleware/auth.rs so every
 * project uses the same pattern: a plain function handlers call at the top
 * (not an actix .wrap() layer), rather than the FromRequest-extractor +
 * app_data<AccessRequirement> wiring this file had before, which required a
 * global to be registered per-route and never actually was.
 */
use serde_json::json;
use crate::BuiltIns::jwt;
use crate::Model::Account::AccountRole;
use actix_web::{Error, HttpRequest};

#[derive(Debug, Clone)]
pub enum AccessRequirement {
    AnyToken,
    Role(AccountRole),
    AnyOf(Vec<AccountRole>),
}

#[derive(Debug)]
pub struct User {
    pub user_id: String,
    pub role: AccountRole,
}

/// Pull the access token off the request. API clients send it as a Bearer
/// header; the browser dashboard can't set that header on a navigation, so
/// it falls back to the `access_token` cookie set at sign-in.
fn extract_token(req: &HttpRequest) -> Option<String> {
    let header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .map(|h| h.trim_start_matches("Bearer ").trim().to_string())
        .filter(|t| !t.is_empty());

    header.or_else(|| {
        req.cookie("access_token")
            .map(|c| c.value().trim().to_string())
            .filter(|t| !t.is_empty())
    })
}

pub fn require_access(
    req: &HttpRequest,
    requirement: AccessRequirement,
) -> Result<User, Error> {
    let token = match extract_token(req) {
        Some(t) => t,
        None => {
            return Err(actix_web::error::ErrorUnauthorized(
                json!({ "error": "Missing authorization header" }),
            ));
        }
    };

    let claims = jwt::access_token::verify(&token, jwt::Key::Local)
        .map_err(|err| {
            log::error!("{:?}", err);
            actix_web::error::ErrorUnauthorized(
                json!({ "error": "Invalid authorization token" }),
            )
        })?;

    let pass = match &requirement {
        AccessRequirement::AnyToken => true,
        AccessRequirement::Role(r) => &claims.role == r,
        AccessRequirement::AnyOf(roles) => roles.contains(&claims.role),
    };

    if !pass {
        return Err(actix_web::error::ErrorForbidden(
            json!({ "error": "Not authorized to perform this action" }),
        ));
    }

    Ok(User {
        user_id: claims.sub,
        role: claims.role,
    })
}
