use mongodb::bson::doc;
use serde::Serialize;
use futures_util::TryStreamExt;
use crate::Model::Documentation::Documentation;
use crate::BuiltIns::mongo::MongoDB;
use crate::utils::response::Response;
use actix_web::{Error, HttpResponse};

// The public feed — no auth, read-only, and a different shape from List's
// raw documents: no created_by/deleted_by, nothing the dashboard-only view
// needs but a visitor has no business seeing. Mirrors handler/project/feed.rs.
//
// `featured` rides along rather than being filtered here, so the home page's
// Docs section can pick the featured ones itself and fall back to the
// newest when nothing is featured — same reasoning as the projects strip.

#[derive(Serialize)]
struct PublicDocumentation {
    uuid: String,
    name: String,
    description: String,
    tags: Vec<String>,
    featured: bool,
    created_at: i64,
}

pub async fn task() -> Result<HttpResponse, Error> {
    let db = MongoDB.connect();

    let cursor = db
        .collection::<Documentation>("documentation")
        .find(doc! { "deleted_at": null })
        .sort(doc! { "created_at": -1 })
        .await;

    let cursor = match cursor {
        Ok(c) => c,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let docs: Vec<Documentation> = match cursor.try_collect().await {
        Ok(v) => v,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let feed: Vec<PublicDocumentation> = docs
        .into_iter()
        .map(|d| PublicDocumentation {
            uuid: d.uuid,
            name: d.name,
            description: d.description,
            tags: d.tags,
            featured: d.featured,
            created_at: d.created_at,
        })
        .collect();

    Ok(HttpResponse::Ok().content_type("application/json").json(feed))
}
