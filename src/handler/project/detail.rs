use mongodb::bson::doc;
use serde::Serialize;
use futures_util::TryStreamExt;
use crate::Model::ImageStruct;
use crate::Model::Project::Project;
use crate::Model::ProjectDetails::{DetailSection, ProjectDetails};
use crate::BuiltIns::mongo::MongoDB;
use crate::utils::response::Response;
use crate::utils::slug::project_slug;
use crate::utils::youtube::extract_video_id;
use actix_web::{web, Error, HttpResponse};

// What /projects/<slug> reads. Public, read-only, and shaped for that one
// page: the project's own fields, its banner, and the long form from
// `project_details` flattened in beside them so the page makes a single
// request.
//
// A project without details is a 404 here even though the project exists —
// there is no page to show, and the card it came from links straight out
// instead. That keeps /projects/<slug> from resolving for every project in
// the feed and leaving crawlers a set of near-empty pages.

#[derive(Serialize)]
struct ImageMeta {
    id: String,
    width: usize,
    height: usize,
    blur_hash: String,
}

#[derive(Serialize)]
struct Video {
    // The 11-character id, so the page can build its own embed URL rather
    // than trusting a stored one.
    id: String,
    title: Option<String>,
}

#[derive(Serialize)]
struct DetailResponse {
    uuid: String,
    slug: String,
    title: String,
    subtitle: String,
    description: String,
    tags: Vec<String>,
    // The URL the card used to point at: on this page it is the call to
    // action rather than the card's destination.
    link: Option<String>,
    accent: Option<String>,
    year: Option<String>,
    created_at: i64,
    image: Option<ImageMeta>,
    videos: Vec<Video>,
    sections: Vec<DetailSection>,
}

pub async fn task(path: web::Path<String>) -> Result<HttpResponse, Error> {
    let wanted = path.into_inner().trim().to_lowercase();
    if wanted.is_empty() {
        return Ok(Response::not_found("No such project"));
    }

    let db = MongoDB.connect();

    // Stored slugs first, then the legacy rows: those have no slug field, so
    // the only way to match them is to slugify their titles here. The
    // collection is small enough that the scan costs nothing, and it means an
    // entry written before slugs existed still has a working URL.
    let project = match db
        .collection::<Project>("project")
        .find_one(doc! { "slug": &wanted, "deleted_at": null })
        .await
    {
        Ok(Some(p)) => Some(p),
        Ok(None) => {
            let cursor = db
                .collection::<Project>("project")
                .find(doc! { "deleted_at": null })
                .await;

            match cursor {
                Ok(c) => match c.try_collect::<Vec<Project>>().await {
                    Ok(list) => list
                        .into_iter()
                        .find(|p| project_slug(&p.slug, &p.title) == wanted),
                    Err(error) => {
                        log::error!("{:?}", error);
                        return Ok(Response::internal_server_error(&error.to_string()));
                    }
                },
                Err(error) => {
                    log::error!("{:?}", error);
                    return Ok(Response::internal_server_error(&error.to_string()));
                }
            }
        }
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let project = match project {
        Some(p) => p,
        None => return Ok(Response::not_found("No such project")),
    };

    let details_id = match &project.details_id {
        Some(id) => id.clone(),
        None => return Ok(Response::not_found("This project has no detail page")),
    };

    let details = db
        .collection::<ProjectDetails>("project_details")
        .find_one(doc! { "uuid": &details_id, "deleted_at": null })
        .await;

    let details = match details {
        Ok(Some(d)) => d,
        // The project points at a row that is gone. Nothing to render, and
        // saying so plainly beats half a page.
        Ok(None) => return Ok(Response::not_found("This project has no detail page")),
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let image = match db
        .collection::<ImageStruct>("image")
        .find_one(doc! { "uuid": &project.image_id })
        .await
    {
        Ok(Some(i)) => Some(ImageMeta {
            id: i.uuid,
            width: i.width,
            height: i.height,
            blur_hash: i.blur_hash,
        }),
        Ok(None) => None,
        // A missing banner is not worth failing the page over; it falls back
        // to the accent gradient, same as the cards do.
        Err(error) => {
            log::error!("{:?}", error);
            None
        }
    };

    // Stored urls are re-parsed rather than passed through: what goes in the
    // page's iframe src is an id this code recognised, never a string an
    // author pasted.
    let videos: Vec<Video> = details
        .videos
        .into_iter()
        .filter_map(|v| {
            extract_video_id(&v.url).map(|id| Video {
                id,
                title: v.title.filter(|t| !t.trim().is_empty()),
            })
        })
        .collect();

    let slug = project_slug(&project.slug, &project.title);

    Ok(HttpResponse::Ok().content_type("application/json").json(DetailResponse {
        uuid: project.uuid,
        slug,
        title: project.title,
        subtitle: project.subtitle,
        description: project.description,
        tags: project.tags,
        link: project.link,
        accent: project.accent,
        year: project.year,
        created_at: project.created_at,
        image,
        videos,
        sections: details.sections,
    }))
}
