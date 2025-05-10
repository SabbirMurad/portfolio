use rand::Rng;
use chrono::Utc;
use mongodb::bson::doc;
use crate::schema::Account;
use crate::Integrations::Smtp;
use crate::BuiltIns::mongo::MongoDB;
use serde::{ Serialize, Deserialize };
use crate::utils::response::Response;
use actix_web::{ web, Error, HttpResponse };

//in minutes
const CODE_EXPIRE_TIME: i64 = 15;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostData { user_id: String }

pub async fn task(form_data: web::Json<PostData>) -> Result<HttpResponse, Error> {
    let post_data = sanitize(&form_data);

    if let Err(res) = check_empty_fields(&post_data) {
        return Ok(Response::bad_request(&res));
    }

    /* DATABASE ACID SESSION INIT */
    let (db, mut session) = MongoDB.connect_acid().await;
    if let Err(error) = session.start_transaction().await {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    //checking if user exist
    let collection = db.collection::<Account::AccountCore>("account_core");
    let result = collection.find_one(
        doc!{"uuid": &post_data.user_id},
    ).await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let option = result.unwrap();
    if let None = option {
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::not_found("User not found"));
    }

    let user = option.unwrap();
    if user.email_verified {
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::forbidden("User already verified"));
    }

    //check if validation code exist
    let collection = db.collection::
    <Account::AccountVerificationRequest>("account_verification_request");
    let result = collection.find_one(
        doc!{"user_id": &post_data.user_id},
    ).await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let option = result.unwrap();
    if let None = option {
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::not_found("Previous validation request not found"));
    }

    let request = option.unwrap();

    //creating new validation request
    let mut rng = rand::rng();
    let validation_code: u32 = rng.random_range(100000..999999);

    //update validation request
    let created_at = Utc::now().timestamp_millis();
    let collection = db.collection::<Account::AccountVerificationRequest>("account_verification_request");
    let result = collection.update_one(
        doc!{
            "uuid": &request.uuid,
            "user_id": &post_data.user_id
        },
        doc!{
            "$set": {
                "validation_code": &validation_code.to_string(),
                "expires_at": created_at + CODE_EXPIRE_TIME * 60 * 1000,
            }
        },
    ).await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let message = Smtp::sign_up_verification_code_template(
        &user.email_address,
        &validation_code.to_string()
    );

    let result = Smtp::send_email(message);
    if let Err(_) = result {
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::internal_server_error("Failed to send email"));
    }

    /* DATABASE ACID COMMIT */
    if let Err(error) = session.commit_transaction().await {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    Ok(HttpResponse::Ok().content_type("application/json").json(
        Response { message: "Successfully Sent".to_string() }
    ))
}

fn sanitize(form_data: &PostData) -> PostData {
    let mut form = form_data.clone();
    form.user_id = form.user_id.trim().to_string();

    form
}

fn check_empty_fields(form_data: &PostData) -> Result<(), String> {
    if form_data.user_id.len() == 0 {
        Err("User id required".to_string())
    }
    else {
        Ok(())
    }
}