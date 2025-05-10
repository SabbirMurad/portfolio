use rand::Rng;
use uuid::Uuid;
use chrono::Utc;
use mongodb::bson::doc;
use actix_session::Session;
use crate::{builtins::jwt, schema::Account};
use crate::Integrations::Smtp;
use crate::BuiltIns::mongo::MongoDB;
use crate::utils::response::Response;
use serde::{ Serialize, Deserialize };
use mongodb::{ClientSession, Database};
use actix_web::{ web, Error, HttpResponse};

//in minutes
const CODE_EXPIRE_TIME: i64 = 15;

#[derive(Debug, Serialize, Deserialize)]
pub struct PostData {
    email_or_username: String,
    password: String
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Payload {
    two_afa_enabled: bool,
    auth_payload: Option<AuthPayload>
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthPayload {
    access_token: String,
    refresh_token: String,
    user_id: String,
    role: Account::AccountRole,
}

pub async fn task(form_data: web::Json<PostData>, actix_session: Session) -> Result<HttpResponse, Error> {
    let email_or_username = form_data.email_or_username.trim().to_string().to_lowercase();
    if email_or_username.len() == 0 {
        return Ok(Response::bad_request("Email/Username is required"));
    }

    let password = form_data.password.trim().to_string();
    if password.len() == 0 {
        return Ok(Response::bad_request("Password is required"));
    }

    /* DATABASE ACID SESSION INIT */
    let (db, mut session) = MongoDB.connect_acid().await;
    if let Err(error) = session.start_transaction().await {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let account_core = match validate_login(
        &db,
        &mut session,
        &email_or_username,
        &password
    ).await {
        Ok(res) => res,
        Err(error) => {
            return Ok(error);
        }
    };

    // checking if 2FA is enabled
    if account_core.two_a_factor_auth_enabled {
        // Create a verification request
        let collection = db.collection::<Account::SignInVerificationRequest>("sign_in_verification_request");

        let mut rng = rand::rng();
        let validation_code: u32 = rng.random_range(100000..999999);

        let request_id = Uuid::now_v7().to_string();
        let now = Utc::now().timestamp_millis();
        let request = Account::SignInVerificationRequest {
            user_id: account_core.uuid.clone(),
            uuid:request_id.clone(),
            expires_at: now + CODE_EXPIRE_TIME * 60 * 1000,
            validation_code: validation_code.to_string(),
        };

        let result = collection.insert_one(
            request,
        ).await;

        if let Err(error) = result {
            log::error!("{:?}", error);
            session.abort_transaction().await.ok().unwrap();
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    
        let message = Smtp::sign_in_verification_code_template(
            &account_core.email_address,
            &validation_code.to_string()
        );
    
        let result = Smtp::send_email(message);
        if let Err(_) = result {
            session.abort_transaction().await.ok().unwrap();
            return Ok(Response::internal_server_error("Failed to send email"));
        }
    }

    // getting access token
    let access_token = jwt::access_token::generate_default(
        &account_core.uuid,
        account_core.role.clone(),
    );

    // getting refresh token
    let result = jwt::refresh_token::new(&account_core.uuid);
    if let Err(error) = result {
        session.abort_transaction().await.ok().unwrap();
        log::error!("{:?}", error); 
        return Ok(Response::internal_server_error(&error));
    }

    let refresh_token = result.unwrap();
  
  
    /* DATABASE ACID COMMIT */
    if let Err(error) = session.commit_transaction().await {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    // setting session
    actix_session.insert("refresh_token", &refresh_token).unwrap();
    actix_session.insert("user_id", &account_core.uuid).unwrap();
    actix_session.insert("role", account_core.role.to_string()).unwrap();

    let data = AuthPayload {
        access_token,
        refresh_token,
        user_id: account_core.uuid.clone(),
        role: account_core.role.clone(),
    };

    let payload = Payload {
        two_afa_enabled: false,
        auth_payload: Some(data)
    };
  
    Ok(HttpResponse::Ok().content_type("application/json").json(payload))
}

// helper functions
async fn validate_login(
    db: &Database,
    session: &mut ClientSession,
    email_or_username: &str,
    password: &str
) -> Result<Account::AccountCore, HttpResponse> {
    let collection = db.collection::<Account::AccountCore>("account_core");

    let result = collection.find_one(
        doc!{"email_address": email_or_username},
    ).await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Err(Response::internal_server_error(&error.to_string()));
    }

    let option = result.unwrap();

    if let None = option {
        let collection = db.collection::<Account::AccountProfile>("account_profile");

        let result = collection.find_one(
            doc!{"username": email_or_username},
        ).await;

        if let Err(error) = result {
            log::error!("{:?}", error);
            session.abort_transaction().await.ok().unwrap();
            return Err(Response::internal_server_error(&error.to_string()));
        }

        let option = result.unwrap();

        if let None = option {
            session.abort_transaction().await.ok().unwrap();
            return Err(Response::not_found("Username or email not found"));
        }

        let account_profile = option.unwrap();

        let collection = db.collection::<Account::AccountCore>("account_core");

        let result = collection.find_one(
            doc!{"uuid": account_profile.uuid},
        ).await;
    
        if let Err(error) = result {
            log::error!("{:?}", error);
            session.abort_transaction().await.ok().unwrap();
            return Err(Response::internal_server_error(&error.to_string()));
        }
    
        let option = result.unwrap();
        let account_core = option.unwrap();

        if account_core.email_verified {
            if account_core.password != password {
                session.abort_transaction().await.ok().unwrap();
                return Err(Response::forbidden("Incorrect password"));
            }
            else {
                return Ok(account_core);
            }
        }
        else {
            if let Err(error) = super::delete_account(
                db,
                session,
                &account_core.uuid
            ).await {
                return Err(error);
            }
            else {
                session.abort_transaction().await.ok().unwrap();
                return Err(Response::not_found("Username or email not found"));
            }
        }
    }

    let account_core = option.unwrap();

    if account_core.email_verified {
        if account_core.password != password {
            session.abort_transaction().await.ok().unwrap();
            return Err(Response::forbidden("Incorrect password"));
        }
        else {
            Ok(account_core)
        }
    }
    else {
        if let Err(error) = super::delete_account(
            db,
            session,
            &account_core.uuid
        ).await {
            Err(error)
        }
        else {
            session.abort_transaction().await.ok().unwrap();
            return Err(Response::not_found("Username or email not found"));
        }
    }
}