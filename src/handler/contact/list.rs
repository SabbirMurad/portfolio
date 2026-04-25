use actix_web::{ web, HttpResponse, Error };
use mongodb::bson::doc;
use futures_util::TryStreamExt;
use serde::Deserialize;
use crate::BuiltIns::mongo::MongoDB;
use crate::Model::Contact;
use crate::utils::{response::Response, regex::regex_escape};

#[derive(Deserialize)]
pub struct Params {
    pub email: Option<String>,
    pub name: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<u64>,
}

pub async fn task(query: web::Query<Params>) -> Result<HttpResponse, Error> {
    let limit = query.limit.unwrap_or(20).clamp(1, 100);
    let offset = query.offset.unwrap_or(0);

    let db = MongoDB.connect();
    let collection = db.collection::<Contact::ContactEmail>("contact_email");

    let mut filter = doc! {};

    if let Some(email) = query.email.clone() {
        filter.insert("email", email);
    }

    
    if let Some(name) = query.name.clone() {
        // Build regex pattern for case-insensitive matching
        let regex_pattern = regex_escape(&name);

        filter.insert(
            "name",
            doc!{ "$regex": &regex_pattern, "$options": "i" }
        );
    }

    let cursor = collection
        .find(filter)
        .sort(doc! { "created_at": -1 })
        .skip(offset)
        .limit(limit)
        .await;

    let cursor = match cursor {
        Ok(c) => c,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let messages: Vec<Contact::ContactEmail> = match cursor.try_collect().await {
        Ok(v) => v,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    Ok(HttpResponse::Ok().json(messages))
}
