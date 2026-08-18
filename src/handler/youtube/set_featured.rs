use chrono::Utc;
use mongodb::bson::doc;
use mongodb::options::ReplaceOptions;
use serde::{Deserialize, Serialize};
use crate::Model::Youtube::FeaturedVideos;
use crate::Model::Account::AccountRole;
use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::{response::Response, youtube::extract_video_id};
use actix_web::{web, Error, HttpRequest, HttpResponse};

const CACHE_KEY: &str = "featured";
const MAX_SECONDARY: usize = 3;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBody {
    // Empty string clears the pick — same as omitting it.
    #[serde(default)]
    primary_video_id: String,
    #[serde(default)]
    secondary_video_ids: Vec<String>,
}

pub async fn task(
    req: HttpRequest,
    form_data: web::Json<RequestBody>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    if form_data.secondary_video_ids.len() > MAX_SECONDARY {
        return Ok(Response::bad_request("At most 3 secondary videos"));
    }

    // Accepts a bare id or a pasted YouTube URL either way — normalized down
    // to the id before it's stored, so feed.rs never has to re-parse it.
    let primary_video_id = if form_data.primary_video_id.trim().is_empty() {
        None
    } else {
        match extract_video_id(&form_data.primary_video_id) {
            Some(id) => Some(id),
            None => return Ok(Response::bad_request("That doesn't look like a YouTube video link or id")),
        }
    };

    let mut secondary_video_ids = Vec::new();
    for raw in form_data.secondary_video_ids.iter() {
        if raw.trim().is_empty() {
            continue;
        }
        match extract_video_id(raw) {
            Some(id) => secondary_video_ids.push(id),
            None => return Ok(Response::bad_request("That doesn't look like a YouTube video link or id")),
        }
    }

    let featured = FeaturedVideos {
        key: CACHE_KEY.to_string(),
        primary_video_id,
        secondary_video_ids,
        updated_at: Utc::now().timestamp_millis(),
    };

    let db = MongoDB.connect();
    let collection = db.collection::<FeaturedVideos>("youtube_featured");
    let opts = ReplaceOptions::builder().upsert(true).build();

    let result = collection
        .replace_one(doc! { "key": CACHE_KEY }, &featured)
        .with_options(opts)
        .await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    // Drop the cached feed so the home page picks up the new picks on its
    // next load instead of waiting out the hour-long TTL (src/handler/
    // youtube/feed.rs).
    let cache = db.collection::<crate::Model::Youtube::YoutubeCache>("youtube_cache");
    let _ = cache.delete_one(doc! { "key": "feed" }).await;

    Ok(HttpResponse::Ok().content_type("application/json").json(featured))
}
