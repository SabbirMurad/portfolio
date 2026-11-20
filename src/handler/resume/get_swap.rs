use mongodb::bson::doc;
use crate::Model::Resume::ResumeSetting;
use crate::Model::Account::AccountRole;
use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::response::Response;
use actix_web::{Error, HttpRequest, HttpResponse};
use super::{ COLLECTION, SETTING_KEY };

pub async fn task(req: HttpRequest) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let db = MongoDB.connect();
    let collection = db.collection::<ResumeSetting>(COLLECTION);

    // Unlike the public pages (super::is_swapped), the dashboard surfaces a
    // read failure rather than quietly showing "not swapped" as if it were
    // the stored state.
    let setting = match collection.find_one(doc! { "key": SETTING_KEY }).await {
        Ok(Some(setting)) => setting,
        Ok(None) => ResumeSetting {
            key: SETTING_KEY.to_string(),
            swapped: false,
            updated_at: 0,
        },
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    Ok(HttpResponse::Ok().content_type("application/json").json(setting))
}
