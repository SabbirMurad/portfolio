use mongodb::bson::doc;
use serde::Serialize;
use std::collections::HashMap;
use futures_util::TryStreamExt;
use crate::Model::ImageStruct;
use crate::Model::Project::Project;
use crate::BuiltIns::mongo::MongoDB;
use crate::utils::response::Response;
use actix_web::{Error, HttpResponse};

// The public feed — no auth, read-only, and deliberately a different shape
// from List's raw documents: the pages need the thumbnail's dimensions and
// blurhash inline (they paint the hash while the file downloads), and they
// have no business seeing created_by/deleted_by.
//
// `featured` rides along rather than being filtered here, so one response
// serves both callers: the home page renders the featured ones, /projects
// renders all of them.

#[derive(Serialize)]
struct ImageMeta {
    id: String,
    width: usize,
    height: usize,
    blur_hash: String,
}

#[derive(Serialize)]
struct PublicProject {
    uuid: String,
    title: String,
    subtitle: String,
    description: String,
    tags: Vec<String>,
    link: Option<String>,
    accent: Option<String>,
    year: Option<String>,
    featured: bool,
    created_at: i64,
    // None when the referenced image record has gone missing — the card falls
    // back to its accent gradient rather than a broken <img>.
    image: Option<ImageMeta>,
}

pub async fn task() -> Result<HttpResponse, Error> {
    let db = MongoDB.connect();

    let cursor = db
        .collection::<Project>("project")
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

    let projects: Vec<Project> = match cursor.try_collect().await {
        Ok(v) => v,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    // One $in over every referenced thumbnail instead of a lookup per card.
    let image_ids: Vec<String> = projects.iter().map(|p| p.image_id.clone()).collect();

    let mut images: HashMap<String, ImageStruct> = HashMap::new();
    if !image_ids.is_empty() {
        let found = db
            .collection::<ImageStruct>("image")
            .find(doc! { "uuid": { "$in": &image_ids } })
            .await;

        match found {
            Ok(cursor) => match cursor.try_collect::<Vec<ImageStruct>>().await {
                Ok(list) => {
                    for image in list {
                        images.insert(image.uuid.clone(), image);
                    }
                }
                // A thumbnail lookup failing shouldn't take the whole feed
                // down; the cards just render without their blurhash.
                Err(error) => log::error!("{:?}", error),
            },
            Err(error) => log::error!("{:?}", error),
        }
    }

    let feed: Vec<PublicProject> = projects
        .into_iter()
        .map(|p| {
            let image = images.get(&p.image_id).map(|i| ImageMeta {
                id: i.uuid.clone(),
                width: i.width,
                height: i.height,
                blur_hash: i.blur_hash.clone(),
            });

            PublicProject {
                uuid: p.uuid,
                title: p.title,
                subtitle: p.subtitle,
                description: p.description,
                tags: p.tags,
                link: p.link,
                accent: p.accent,
                year: p.year,
                featured: p.featured,
                created_at: p.created_at,
                image,
            }
        })
        .collect();

    Ok(HttpResponse::Ok().content_type("application/json").json(feed))
}
