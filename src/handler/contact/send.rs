use actix_web::{ web, Error, HttpResponse };
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;
use crate::Integrations::Smtp;
use crate::utils::response::Response;
use crate::BuiltIns::mongo::MongoDB;
use crate::Model::Contact;

#[derive(Deserialize)]
pub struct ContactForm {
    pub name: String,
    pub email: String,
    pub subject: String,
    pub message: String,
}

pub async fn task(body: web::Json<ContactForm>) -> Result<HttpResponse, Error> {
    let name = body.name.trim();
    let email = body.email.trim();
    let subject = body.subject.trim();
    let message = body.message.trim();

    if name.is_empty() || email.is_empty() || subject.is_empty() || message.is_empty() {
        return Ok(Response::bad_request("All fields are required"));
    }

    
    /* DATABASE ACID SESSION INIT */

    let (db, mut session) = MongoDB.connect_acid().await;
    if let Err(error) = session.start_transaction().await {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let data = Contact::ContactEmail {
        uuid: Uuid::new_v4().to_string(),
        name: name.to_string(),
        email: email.to_string(),
        subject: subject.to_string(),
        message: message.to_string(),
        created_at: Utc::now().timestamp_millis()
    };
    
    let collection = db.collection::<Contact::ContactEmail>("contact_email");
    let result = collection.insert_one(data).await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::internal_server_error(&error.to_string()));
    }
    
    let mail = Smtp::contact_message_template(name, email, subject, message);

    let result = Smtp::send_email(mail);

    if let Err(error) = result {
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::internal_server_error(&error));
    }

    /* DATABASE ACID COMMIT */
    if let Err(error) = session.commit_transaction().await {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    Ok(HttpResponse::Ok().json(Response {
        message: "Message sent".to_string()
    }))
}
