/*
 * API auth gate — ported from postura_rust's src/middleware/auth.rs so every
 * project uses the same pattern: a plain function handlers call at the top
 * (not an actix .wrap() layer), rather than the FromRequest-extractor +
 * app_data<AccessRequirement> wiring this file had before, which required a
 * global to be registered per-route and never actually was.
 */
use chrono::Utc;
use mongodb::bson::doc;
use serde_json::json;
use sha2::{Digest, Sha256};
use crate::BuiltIns::jwt;
use crate::BuiltIns::mongo::MongoDB;
use crate::Model::Account::AccountRole;
use crate::Model::CliToken::CliToken;
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

/* ── CLI access ───────────────────────────────────────────────────────────
 * A second, stricter gate, used only by the shell *execution* routes
 * (src/handler/shell.rs: targets, describe, run, jobs). Signing up, signing in
 * and everything the dashboard does — including uploading a bundle — go
 * through `require_access` above and stay perfectly usable from a browser.
 *
 * Two rules, and it is worth being precise about what each buys:
 *
 *   1. Only an opaque CLI token in an Authorization header is accepted. The
 *      dashboard's session cookie is not, so a page on this origin cannot
 *      reach these routes even while signed in as an administrator — the
 *      credential lives in a file the browser has no way to read.
 *
 *   2. Requests carrying browser fetch metadata are refused outright. A
 *      browser sets Sec-Fetch-* and Origin itself and page script cannot
 *      suppress them, so their presence is a reliable "this came from a
 *      browser". That is the one direction of this check that actually holds.
 *
 * What this does NOT do is prove a request came from a terminal. Postman, or
 * any script, can send exactly the bytes a terminal sends; nothing observable
 * over HTTP separates them. The token is the security boundary. Keeping the
 * browser out is a real but separate concern.
 */

/// Hex-encoded SHA-256 — the form CliToken.token_hash is stored in.
pub fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

/// Fetch metadata is set by the browser, not by the page, so script on the
/// calling side cannot strip it.
fn looks_like_a_browser(req: &HttpRequest) -> bool {
    ["sec-fetch-mode", "sec-fetch-site", "sec-fetch-dest", "origin"]
        .iter()
        .any(|h| req.headers().contains_key(*h))
}

fn bearer(req: &HttpRequest) -> Option<String> {
    req.headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
}

pub async fn require_cli(
    req: &HttpRequest,
    requirement: AccessRequirement,
) -> Result<User, Error> {
    if looks_like_a_browser(req) {
        return Err(actix_web::error::ErrorForbidden(json!({
            "error": "This endpoint is not callable from a browser. Install the CLI with: curl -fsSL https://sabbirhassan.com/install.sh | bash"
        })));
    }

    let token = match bearer(req) {
        Some(t) => t,
        None => {
            return Err(actix_web::error::ErrorUnauthorized(json!({
                "error": "Missing CLI token. Run `ct login` first."
            })));
        }
    };

    let db = MongoDB.connect();
    let collection = db.collection::<CliToken>("cli_token");

    let found = collection
        .find_one(doc! { "token_hash": hash_token(&token), "revoked_at": null })
        .await;

    let record = match found {
        Ok(Some(record)) => record,
        Ok(None) => {
            return Err(actix_web::error::ErrorUnauthorized(json!({
                "error": "Invalid CLI token. Run `ct login` again."
            })));
        }
        Err(error) => {
            log::error!("{:?}", error);
            return Err(actix_web::error::ErrorInternalServerError(json!({
                "error": "Could not verify the token"
            })));
        }
    };

    let now = Utc::now().timestamp_millis();
    if record.expires_at <= now {
        return Err(actix_web::error::ErrorUnauthorized(json!({
            "error": "CLI token has expired. Run `ct login` again."
        })));
    }

    let pass = match &requirement {
        AccessRequirement::AnyToken => true,
        AccessRequirement::Role(r) => &record.role == r,
        AccessRequirement::AnyOf(roles) => roles.contains(&record.role),
    };

    if !pass {
        return Err(actix_web::error::ErrorForbidden(json!({
            "error": "Not authorized to perform this action"
        })));
    }

    // Best-effort: a failure to stamp last-used must not fail the request.
    let _ = collection
        .update_one(
            doc! { "uuid": &record.uuid },
            doc! { "$set": { "last_used_at": now } },
        )
        .await;

    Ok(User {
        user_id: record.user_id,
        role: record.role,
    })
}

/// For the handful of routes a dashboard session *or* a CLI token may call
/// (bundle listing, reading a README): try the session first, and only reach
/// for a CLI token when the request doesn't look like a browser's in the
/// first place.
///
/// Doing it this way — rather than the equivalent-looking `if
/// require_access(..).is_err() { require_cli(..).await? }` each of those
/// routes used to write inline — matters for exactly one case: a browser
/// whose access_token cookie has simply expired. That request *does* look
/// like a browser, so without this it fell through to require_cli, which
/// rejects anything carrying browser fetch metadata — and the dashboard's own
/// Fetcher, built to retry once after a silent refresh on a 401, never got
/// the 401 require_access would have sent; it got require_cli's "install the
/// CLI" 403 instead, and the UI had nothing to recover from. Refusing to even
/// try require_cli when the request looks like a browser restores that 401,
/// at the cost of a CLI call that somehow carries Sec-Fetch-* headers also
/// landing on require_access's error instead of require_cli's — a caller
/// that unusual can read either message fine.
pub async fn require_access_or_cli(
    req: &HttpRequest,
    requirement: AccessRequirement,
) -> Result<User, Error> {
    match require_access(req, requirement.clone()) {
        Ok(user) => Ok(user),
        Err(access_err) => {
            if looks_like_a_browser(req) {
                Err(access_err)
            } else {
                require_cli(req, requirement).await
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hashing_is_stable_and_hides_the_token() {
        let a = hash_token("abc");
        assert_eq!(a, hash_token("abc"));
        assert_ne!(a, hash_token("abd"));
        assert_eq!(a.len(), 64, "hex sha-256");
        assert!(!a.contains("abc"));
    }
}
