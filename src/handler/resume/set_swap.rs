use chrono::Utc;
use mongodb::bson::doc;
use mongodb::options::ReplaceOptions;
use serde::{Deserialize, Serialize};
use crate::Model::Resume::ResumeSetting;
use crate::Model::Account::AccountRole;
use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::response::Response;
use actix_web::{web, Error, HttpRequest, HttpResponse};
use super::{ COLLECTION, SETTING_KEY };

// The state to end up in, not "toggle": a double click or a retried request
// then lands where it was meant to instead of flipping back.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBody {
    swapped: bool,
}

pub async fn task(
    req: HttpRequest,
    form_data: web::Json<RequestBody>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let setting = ResumeSetting {
        key: SETTING_KEY.to_string(),
        swapped: form_data.swapped,
        updated_at: Utc::now().timestamp_millis(),
    };

    let db = MongoDB.connect();
    let collection = db.collection::<ResumeSetting>(COLLECTION);
    let opts = ReplaceOptions::builder().upsert(true).build();

    let result = collection
        .replace_one(doc! { "key": SETTING_KEY }, &setting)
        .with_options(opts)
        .await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    Ok(HttpResponse::Ok().content_type("application/json").json(setting))
}
