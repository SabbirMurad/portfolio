// use rand::Rng;
// use uuid::Uuid;
// use chrono::Utc;
// use mongodb::bson::doc;
// use crate::Model::Account;
// use crate::Integrations::Smtp;
// use crate::BuiltIns::mongo::MongoDB;
// use serde::{ Serialize, Deserialize };
// use mongodb::{ClientSession, Database};
// use actix_web::{ web, Error, HttpResponse };
// use crate::utils::response::Response;
// use crate::utils::validation::{validate_email, validate_full_name, validate_password, validate_username};


// //in minutes
// const CODE_EXPIRE_TIME: i64 = 15;

// #[derive(Debug, Clone, Serialize, Deserialize)]
// pub struct RequestBody {
//     name: String,
//     file: Vec<u8>,
// }

// #[derive(Debug, Clone, Serialize, Deserialize)]
// struct ResponseBody {
//     uuid: String,
//     name: String,
// }


// pub async fn task(form_data: web::Json<RequestBody>) -> Result<HttpResponse, Error> {
//     /* DATABASE ACID SESSION INIT */

//     let (db, mut session) = MongoDB.connect_acid().await;
//     if let Err(error) = session.start_transaction().await {
//         log::error!("{:?}", error);
//         return Ok(Response::internal_server_error(&error.to_string()));
//     }

//     //check if user already exist
//     if let Err(error) = account_already_exist(
//         &db,
//         &mut session,
//         &post_data.username,
//         &post_data.email_address
//     ).await {
//         return Ok(error);
//     }

//     //creating account_core
//     let now = Utc::now().timestamp_millis();
//     let user_id: String = Uuid::now_v7().to_string();

//     let account_core = Account::AccountCore {
//         uuid: user_id.clone(),
//         email_address: post_data.email_address.clone(),
//         password: post_data.password.clone(),
//         email_verified: false,
//         two_a_factor_auth_enabled: false,
//         two_a_factor_auth_updated: None,
//         role: Account::AccountRole::User,
//         suspended_at: None,
//         suspended_by: None,
//         created_at: now,
//     };

//     let collection = db.collection::<Account::AccountCore>("account_core");
//     let result = collection.insert_one(
//         account_core,
//     ).await;

//     if let Err(error) = result {
//       log::error!("{:?}", error);
//       session.abort_transaction().await.ok().unwrap();
//       return Ok(Response::internal_server_error(&error.to_string()));
//     }

//     //creating account_profile
//     let collection = db.collection::
//     <Account::AccountProfile>("account_profile");

//     let account_profile = Account::AccountProfile {
//         uuid: user_id.clone(),
//         username: post_data.username.clone(),
//         full_name: post_data.full_name.clone(),
//         profile_picture: None,
//         biography: None,
//         date_of_birth: None,
//         gender: None,
//         phone_number: None,
//         modified_at: now,
//         profile_verified: false,
//     };

//     let result = collection.insert_one(
//         account_profile,
//     ).await;

//     if let Err(error) = result {
//         log::error!("{:?}", error);
//         session.abort_transaction().await.ok().unwrap();
//         return Ok(Response::internal_server_error(&error.to_string()));
//     }
  

//     //creating validation request
//     let mut rng = rand::rng();
//     let validation_code: u32 = rng.random_range(100000..999999);
//     let request = Account::AccountVerificationRequest {
//         uuid: Uuid::now_v7().to_string(),
//         user_id: user_id.clone(),
//         validation_code: validation_code.to_string(),
//         expires_at: now + CODE_EXPIRE_TIME * 60 * 1000,
//     };
    
//     let collection = db.collection::
//     <Account::AccountVerificationRequest>("account_verification_request");
//     let result = collection.insert_one(
//         request,
//     ).await;

//     if let Err(error) = result {
//         log::error!("{:?}", error);
//         session.abort_transaction().await.ok().unwrap();
//         return Ok(Response::internal_server_error(&error.to_string()));
//     }

//     let message = Smtp::sign_up_verification_code_template(
//         &post_data.email_address,
//         &validation_code.to_string()
//     );

//     let result = Smtp::send_email(message);
//     if let Err(_) = result {
//         session.abort_transaction().await.ok().unwrap();
//         return Ok(Response::internal_server_error("Failed to send email"));
//     }

//     /* DATABASE ACID COMMIT */
//     if let Err(error) = session.commit_transaction().await {
//         log::error!("{:?}", error);
//         return Ok(Response::internal_server_error(&error.to_string()));
//     }

//     let data = Payload { user_id };
//     Ok(HttpResponse::Ok().content_type("application/json").json(data))
// }