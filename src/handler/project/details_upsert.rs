use uuid::Uuid;
use chrono::Utc;
use mongodb::bson::{doc, to_bson};
use serde::{Deserialize, Serialize};
use crate::Model::Project::Project;
use crate::Model::Account::AccountRole;
use crate::Model::ProjectDetails::{DetailSection, ProjectDetails, VideoLink};
use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::response::Response;
use crate::utils::slug::slugify;
use crate::utils::youtube::extract_video_id;
use actix_web::{web, Error, HttpRequest, HttpResponse};

// Writes the long form of a project — the videos and the titled sections the
// detail page is made of — and points the project at it.
//
// Upsert rather than create/update as a pair: the dashboard edits the whole
// thing as one form and sends it back whole, so there is one row per project
// and one code path whether it is the first save or the fifth. Sending empty
// lists is how an author empties the page; DELETE is how they remove it.

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct VideoInput {
    url: String,
    #[serde(default)]
    title: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SectionInput {
    title: String,
    body: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RequestBody {
    #[serde(default)]
    videos: Vec<VideoInput>,
    #[serde(default)]
    sections: Vec<SectionInput>,
}

#[derive(Debug, Deserialize)]
pub struct PathVariables {
    uuid: String,
}

#[derive(Debug, Serialize)]
struct ResponseBody {
    details_id: String,
    slug: String,
    videos: usize,
    sections: usize,
}

pub async fn task(
    req: HttpRequest,
    path: web::Path<PathVariables>,
    form_data: web::Json<RequestBody>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let db = MongoDB.connect();
    let projects = db.collection::<Project>("project");

    let project = match projects
        .find_one(doc! { "uuid": &path.uuid, "deleted_at": null })
        .await
    {
        Ok(Some(p)) => p,
        Ok(None) => return Ok(Response::not_found("Project not found")),
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    // Every video is parsed down to an id before it is stored: a link that
    // cannot be read as a YouTube video is rejected here rather than becoming
    // a dead iframe on the public page.
    let mut videos: Vec<VideoLink> = Vec::with_capacity(form_data.videos.len());
    for (index, video) in form_data.videos.iter().enumerate() {
        let url = video.url.trim();
        if url.is_empty() {
            continue;
        }
        if extract_video_id(url).is_none() {
            return Ok(Response::bad_request(&format!(
                "Video {} is not a YouTube link or id",
                index + 1
            )));
        }
        videos.push(VideoLink {
            url: url.to_string(),
            title: video
                .title
                .as_ref()
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty()),
        });
    }

    let mut sections: Vec<DetailSection> = Vec::with_capacity(form_data.sections.len());
    for (index, section) in form_data.sections.iter().enumerate() {
        let title = section.title.trim().to_string();
        let body = section.body.trim().to_string();

        // A blank pair is an empty row the author left behind in the form.
        if title.is_empty() && body.is_empty() {
            continue;
        }
        if title.is_empty() || body.is_empty() {
            return Ok(Response::bad_request(&format!(
                "Section {} needs both a title and a description",
                index + 1
            )));
        }

        sections.push(DetailSection { title, body });
    }

    let now = Utc::now().timestamp_millis();
    let details_collection = db.collection::<ProjectDetails>("project_details");

    let videos_bson = match to_bson(&videos) {
        Ok(v) => v,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };
    let sections_bson = match to_bson(&sections) {
        Ok(v) => v,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    // An existing row is found by project rather than by the id on the
    // project, so a project whose details_id was lost still edits its own row
    // instead of growing a second one.
    let existing = details_collection
        .find_one(doc! { "project_uuid": &project.uuid, "deleted_at": null })
        .await;

    let details_id = match existing {
        Ok(Some(found)) => {
            let update = details_collection
                .update_one(
                    doc! { "uuid": &found.uuid },
                    doc! { "$set": {
                        "videos": videos_bson,
                        "sections": sections_bson,
                        "updated_at": now,
                    }},
                )
                .await;

            if let Err(error) = update {
                log::error!("{:?}", error);
                return Ok(Response::internal_server_error(&error.to_string()));
            }

            found.uuid
        }
        Ok(None) => {
            let details = ProjectDetails {
                uuid: Uuid::now_v7().to_string(),
                project_uuid: project.uuid.clone(),
                videos: videos.clone(),
                sections: sections.clone(),
                created_at: now,
                created_by: "admin".to_string(),
                updated_at: None,
                deleted_at: None,
                deleted_by: None,
            };

            let id = details.uuid.clone();
            if let Err(error) = details_collection.insert_one(details).await {
                log::error!("{:?}", error);
                return Ok(Response::internal_server_error(&error.to_string()));
            }

            id
        }
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    // The slug is settled at the same time. Legacy rows have none, and the
    // one they answer to is derived from their title — writing it down now
    // pins the URL before the page goes live, so a later title edit cannot
    // silently move a page people have linked to.
    let slug = pick_slug(&db, &project).await?;

    let update = projects
        .update_one(
            doc! { "uuid": &project.uuid },
            doc! { "$set": { "details_id": &details_id, "slug": &slug } },
        )
        .await;

    if let Err(error) = update {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    Ok(HttpResponse::Ok().content_type("application/json").json(ResponseBody {
        details_id,
        slug,
        videos: videos.len(),
        sections: sections.len(),
    }))
}

// The slug this project should own: the one it already has, otherwise its
// title's, with a numeric suffix if another project got there first. A title
// of nothing but punctuation slugifies to "", so the uuid stands in — a URL
// nobody will love, but one that resolves.
async fn pick_slug(
    db: &mongodb::Database,
    project: &Project,
) -> Result<String, Error> {
    if let Some(existing) = project.slug.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
        return Ok(existing.to_string());
    }

    let base = {
        let from_title = slugify(&project.title);
        if from_title.is_empty() { project.uuid.clone() } else { from_title }
    };

    let projects = db.collection::<Project>("project");
    let mut candidate = base.clone();

    for suffix in 2..100 {
        let taken = projects
            .find_one(doc! {
                "slug": &candidate,
                "uuid": { "$ne": &project.uuid },
                "deleted_at": null,
            })
            .await;

        match taken {
            Ok(None) => return Ok(candidate),
            Ok(Some(_)) => candidate = format!("{}-{}", base, suffix),
            Err(error) => {
                log::error!("{:?}", error);
                return Ok(project.uuid.clone());
            }
        }
    }

    // A hundred projects with the same title is not a real situation, but the
    // loop has to end somewhere and the uuid is always free.
    Ok(project.uuid.clone())
}

#[cfg(test)]
mod tests {
    use crate::utils::youtube::extract_video_id;

    #[test]
    fn the_link_shapes_an_author_would_paste_all_parse() {
        for input in [
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtu.be/dQw4w9WgXcQ",
            "https://www.youtube.com/embed/dQw4w9WgXcQ",
            "https://www.youtube.com/shorts/dQw4w9WgXcQ",
            "dQw4w9WgXcQ",
        ] {
            assert_eq!(extract_video_id(input).as_deref(), Some("dQw4w9WgXcQ"), "{}", input);
        }
    }

    #[test]
    fn anything_else_is_refused_before_it_reaches_an_iframe() {
        for input in [
            "https://vimeo.com/12345",
            "javascript:alert(1)",
            "https://www.youtube.com/watch?v=short",
            "",
        ] {
            assert!(extract_video_id(input).is_none(), "{}", input);
        }
    }
}
