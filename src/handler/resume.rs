use actix_web::{ Error, HttpResponse };
use mongodb::bson::doc;
use crate::BuiltIns::mongo::MongoDB;
use crate::Model::Resume::ResumeSetting;

pub mod get_swap;
pub use get_swap as GetSwap;

pub mod set_swap;
pub use set_swap as SetSwap;

/// Collection and singleton key for the A/B swap (Model::Resume).
pub const COLLECTION: &str = "resume_setting";
pub const SETTING_KEY: &str = "swap";

/// Whether A and B are currently swapped. A missing doc or a Mongo failure
/// both read as "not swapped": the CV is the page a recruiter opens, so it
/// renders the default rather than a 500.
pub async fn is_swapped() -> bool {
    let db = MongoDB.connect();
    let collection = db.collection::<ResumeSetting>(COLLECTION);

    match collection.find_one(doc! { "key": SETTING_KEY }).await {
        Ok(Some(setting)) => setting.swapped,
        Ok(None) => false,
        Err(error) => {
            log::error!("{:?}", error);
            false
        }
    }
}

pub async fn task() -> Result<HttpResponse, Error> {
    let pdf = tokio::fs::read("assets/cv.pdf").await
        .map_err(|_| actix_web::error::ErrorNotFound("cv.pdf not found"))?;

    Ok(HttpResponse::Ok()
        .content_type("application/pdf")
        .body(pdf))
}
