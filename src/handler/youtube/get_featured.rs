use mongodb::bson::doc;
use crate::Model::Youtube::FeaturedVideos;
use crate::Model::Account::AccountRole;
use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::response::Response;
use actix_web::{Error, HttpRequest, HttpResponse};

const CACHE_KEY: &str = "featured";

pub async fn task(req: HttpRequest) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let db = MongoDB.connect();
    let collection = db.collection::<FeaturedVideos>("youtube_featured");

    let result = collection.find_one(doc! { "key": CACHE_KEY }).await;

    let featured = match result {
        Ok(Some(doc)) => doc,
        Ok(None) => FeaturedVideos {
            key: CACHE_KEY.to_string(),
            primary_video_id: None,
            secondary_video_ids: vec![],
            updated_at: 0,
        },
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    Ok(HttpResponse::Ok().content_type("application/json").json(featured))
}
