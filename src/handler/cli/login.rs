/*
 * Terminal login: exchange the same credentials the browser sign-in takes for
 * a CLI token, which is the only thing the shell execution routes accept.
 *
 * Unauthenticated by necessity — this is how a caller *gets* a credential —
 * but it is not a way in that the browser sign-in isn't: same account, same
 * password check (handler/auth/sign_in.rs::validate_login is shared rather
 * than copied), same failure responses.
 *
 * The token is returned exactly once. Only its SHA-256 is stored, so a dump of
 * the collection yields nothing replayable.
 */
use chrono::Utc;
use mongodb::bson::doc;
use rand::Rng;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use actix_web::{web, Error, HttpResponse};

use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::hash_token;
use crate::Model::Account::AccountRole;
use crate::Model::CliToken::CliToken;
use crate::utils::response::Response;

/// Long enough that a machine sitting in a drawer doesn't need re-authing
/// weekly, short enough that a forgotten one lapses.
const TOKEN_DAYS: i64 = 30;
/// 32 bytes of randomness, hex-encoded to 64 characters.
const TOKEN_BYTES: usize = 32;

#[derive(Debug, Deserialize)]
pub struct PostData {
    email_or_username: String,
    password: String,
    /// Usually the caller's hostname, so `ct` tokens read sensibly in a list.
    #[serde(default)]
    label: String,
}

#[derive(Debug, Serialize)]
struct Payload {
    token: String,
    user_id: String,
    role: AccountRole,
    expires_at: i64,
}

pub async fn task(form_data: web::Json<PostData>) -> Result<HttpResponse, Error> {
    let email_or_username = form_data.email_or_username.trim().to_lowercase();
    if email_or_username.is_empty() {
        return Ok(Response::bad_request("Email/Username is required"));
    }

    let password = form_data.password.trim().to_string();
    if password.is_empty() {
        return Ok(Response::bad_request("Password is required"));
    }

    let label = {
        let raw = form_data.label.trim();
        let cleaned: String = raw
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_' || *c == '.')
            .take(64)
            .collect();
        if cleaned.is_empty() {
            "cli".to_string()
        } else {
            cleaned
        }
    };

    /* DATABASE ACID SESSION INIT */
    let (db, mut session) = MongoDB.connect_acid().await;
    if let Err(error) = session.start_transaction().await {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let account = match crate::Handler::Auth::SignIn::validate_login(
        &db,
        &mut session,
        &email_or_username,
        &password,
    )
    .await
    {
        Ok(account) => account,
        Err(error) => return Ok(error),
    };

    if let Err(error) = session.commit_transaction().await {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let mut rng = rand::rng();
    let mut bytes = [0u8; TOKEN_BYTES];
    rng.fill(&mut bytes);
    let token = hex::encode(bytes);

    let now = Utc::now().timestamp_millis();
    let expires_at = now + TOKEN_DAYS * 24 * 60 * 60 * 1000;

    let record = CliToken {
        uuid: Uuid::now_v7().to_string(),
        user_id: account.uuid.clone(),
        role: account.role.clone(),
        token_hash: hash_token(&token),
        label,
        created_at: now,
        expires_at,
        last_used_at: None,
        revoked_at: None,
    };

    let collection = db.collection::<CliToken>("cli_token");
    if let Err(error) = collection.insert_one(record).await {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    Ok(HttpResponse::Ok().content_type("application/json").json(Payload {
        token,
        user_id: account.uuid,
        role: account.role,
        expires_at,
    }))
}
