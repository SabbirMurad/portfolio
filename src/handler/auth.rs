use mongodb::bson::doc;
use crate::Model::Account;
use actix_web::HttpResponse;
use mongodb::{ClientSession, Database};
use crate::utils::response::Response;
use actix_web::cookie::{time::Duration, Cookie, SameSite};

pub mod refresh;
pub use refresh as Refresh;

pub mod sign_up;
pub use sign_up as SignUp;

pub mod verify_email;
pub use verify_email as VerifyEmail;

pub mod resend_verification_code;
pub use resend_verification_code as ResendVerificationCode;

pub mod sign_in;
pub use sign_in as SignIn;

pub mod sign_out;
pub use sign_out as SignOut;

pub mod forgot_password;
pub use forgot_password as ForgotPassword;

pub mod verify_reset_code;
pub use verify_reset_code as VerifyResetCode;

pub mod reset_password;
pub use reset_password as ResetPassword;


/// Cookies are marked `Secure` everywhere except local development, matching
/// postura_rust's convention (src/handler/auth.rs there).
fn cookie_secure() -> bool {
    std::env::var("APP_STAGE").map(|s| s != "development").unwrap_or(true)
}

/// httpOnly access-token cookie the API auth middleware (src/middleware/auth.rs
/// `require_access`) reads back on requests it can't attach a Bearer header to
/// — i.e. the browser dashboard.
pub fn auth_access_cookie(token: String) -> Cookie<'static> {
    Cookie::build("access_token", token)
        .path("/")
        .http_only(true)
        .secure(cookie_secure())
        .same_site(SameSite::Strict)
        // Matches the access token's own TTL (Time::Minute(15) in
        // src/builtins/jwt.rs access_token::generate_default).
        .max_age(Duration::minutes(15))
        .finish()
}

/// httpOnly refresh-token cookie; POST /api/auth/refresh reads this to mint a
/// fresh access-token cookie once the short-lived one above expires.
pub fn auth_refresh_cookie(token: String) -> Cookie<'static> {
    Cookie::build("refresh_token", token)
        .path("/")
        .http_only(true)
        .secure(cookie_secure())
        .same_site(SameSite::Strict)
        .max_age(Duration::days(15))
        .finish()
}

/// An expired cookie (max-age 0) used to clear an auth cookie on sign-out.
pub fn expired_auth_cookie(name: &'static str) -> Cookie<'static> {
    Cookie::build(name, "")
        .path("/")
        .http_only(true)
        .secure(cookie_secure())
        .same_site(SameSite::Strict)
        .max_age(Duration::seconds(0))
        .finish()
}

/// Look up an account's role by uuid — used by /api/auth/refresh, which only
/// has the refresh token's subject (no role) to go on.
pub async fn resolve_role(db: &Database, uuid: &str) -> Option<Account::AccountRole> {
    let collection = db.collection::<Account::AccountCore>("account_core");
    collection.find_one(doc! { "uuid": uuid }).await.ok().flatten().map(|a| a.role)
}

pub async fn delete_account(
    db: &Database,
    session: &mut ClientSession,
    user_id: &str
) -> Result<(), HttpResponse> {
    let collection = db.collection::<Account::AccountCore>("account_core");
    let result = collection.delete_one(
        doc!{"uuid": user_id},
    ).await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Err(Response::internal_server_error(&error.to_string()));
    }

    let collection = db.collection::
    <Account::AccountProfile>("account_profile");
    let result = collection.delete_one(
        doc!{"uuid": user_id},
    ).await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Err(Response::internal_server_error(&error.to_string()));
    }

    let collection = db.collection::
    <Account::AccountVerificationRequest>("account_verification_request");
    let result = collection.delete_one(
        doc!{"uuid": user_id},
    ).await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Err(Response::internal_server_error(&error.to_string()));
    }

    Ok(())
}