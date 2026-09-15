use mongodb::bson::doc;
use serde::{Deserialize, Serialize};
use crate::Model::Project::Project;
use crate::Model::Account::AccountRole;
use crate::Model::ProjectDetails::{DetailSection, ProjectDetails, VideoLink};
use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::response::Response;
use actix_web::{web, Error, HttpRequest, HttpResponse};

// What the dashboard loads into the details editor. Admin-only and shaped
// like the form rather than like the page: urls exactly as the author typed
// them, so editing an entry shows back what was saved instead of a
// normalised version of it.
//
// A project with no details answers 200 with empty lists — the editor opens
// on a blank form, which is the same screen as "nothing here yet".

#[derive(Debug, Deserialize)]
pub struct PathVariables {
    uuid: String,
}

#[derive(Debug, Serialize)]
struct ResponseBody {
    project_uuid: String,
    details_id: Option<String>,
    videos: Vec<VideoLink>,
    sections: Vec<DetailSection>,
}

pub async fn task(
    req: HttpRequest,
    path: web::Path<PathVariables>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let db = MongoDB.connect();

    let project = match db
        .collection::<Project>("project")
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

    let details = match db
        .collection::<ProjectDetails>("project_details")
        .find_one(doc! { "project_uuid": &project.uuid, "deleted_at": null })
        .await
    {
        Ok(found) => found,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let body = match details {
        Some(d) => ResponseBody {
            project_uuid: project.uuid,
            details_id: Some(d.uuid),
            videos: d.videos,
            sections: d.sections,
        },
        None => ResponseBody {
            project_uuid: project.uuid,
            details_id: None,
            videos: Vec::new(),
            sections: Vec::new(),
        },
    };

    Ok(HttpResponse::Ok().content_type("application/json").json(body))
}
