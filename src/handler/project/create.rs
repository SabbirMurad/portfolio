use uuid::Uuid;
use chrono::Utc;
use mongodb::bson::doc;
use serde::{Serialize, Deserialize};
use crate::Model::Project::Project;
use crate::Model::Account::AccountRole;
use crate::BuiltIns::mongo::MongoDB;
use crate::builtins::sqlite;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::response::Response;
use actix_web::{web, Error, HttpRequest, HttpResponse};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBody {
    title: String,
    subtitle: String,
    description: String,
    tags: Vec<String>,
    // From a prior POST /api/image/upload — this endpoint never takes the
    // image bytes directly.
    image_id: String,
    // Optional card fields — see Model::Project for what each one is for.
    #[serde(default)]
    link: Option<String>,
    #[serde(default)]
    accent: Option<String>,
    #[serde(default)]
    year: Option<String>,
}

// "" and "   " both mean "not given" coming from a form field.
fn optional(value: &Option<String>) -> Option<String> {
    value
        .as_ref()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

// The card renders `link` straight into an href, so anything that isn't a
// plain http(s) or same-site URL is rejected before it can become a
// `javascript:` anchor on the public page. Protocol-relative ("//evil.com")
// is out too — it reads as same-site but isn't.
fn valid_link(link: &str) -> bool {
    link.starts_with("http://")
        || link.starts_with("https://")
        || (link.starts_with('/') && !link.starts_with("//"))
}

// Goes into a `style` attribute; #rgb/#rrggbb only, nothing else.
fn valid_accent(accent: &str) -> bool {
    match accent.strip_prefix('#') {
        Some(body) => {
            (body.len() == 3 || body.len() == 6) && body.chars().all(|c| c.is_ascii_hexdigit())
        }
        None => false,
    }
}

#[derive(Debug, Serialize)]
struct ResponseBody {
    uuid: String,
    title: String,
}

pub async fn task(
    req: HttpRequest,
    form_data: web::Json<RequestBody>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let title = form_data.title.trim().to_string();
    let subtitle = form_data.subtitle.trim().to_string();
    let description = form_data.description.trim().to_string();
    let image_id = form_data.image_id.trim().to_string();
    let link = optional(&form_data.link);
    let accent = optional(&form_data.accent);
    let year = optional(&form_data.year);

    if title.is_empty() {
        return Ok(Response::bad_request("Title is required"));
    }
    if description.is_empty() {
        return Ok(Response::bad_request("Description is required"));
    }
    if image_id.is_empty() {
        return Ok(Response::bad_request("Thumbnail image is required"));
    }

    if link.as_deref().is_some_and(|l| !valid_link(l)) {
        return Ok(Response::bad_request("Link must start with http://, https:// or /"));
    }

    if accent.as_deref().is_some_and(|a| !valid_accent(a)) {
        return Ok(Response::bad_request("Accent must be a hex colour like #DE4520"));
    }

    // The image_id has to point at something real — catches a stale/typo'd
    // id before it ends up referenced by a live project.
    let db_conn = match sqlite::connect(sqlite::DBF::IMG) {
        Ok(conn) => conn,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };
    let image_exists: Result<i64, _> = db_conn.query_row(
        "SELECT 1 FROM image WHERE uuid = ?1",
        [&image_id],
        |row| row.get(0),
    );
    if image_exists.is_err() {
        return Ok(Response::bad_request("Unknown image_id — upload the thumbnail first"));
    }

    let db = MongoDB.connect();
    let collection = db.collection::<Project>("project");

    let existing = collection.find_one(doc! { "title": &title, "deleted_at": null }).await;
    match existing {
        Ok(Some(_)) => {
            return Ok(Response::bad_request("A project with this title already exists"));
        }
        Ok(None) => {}
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    }

    let uuid = Uuid::now_v7().to_string();
    let project = Project {
        uuid: uuid.clone(),
        title: title.clone(),
        subtitle,
        description,
        tags: form_data.tags.clone(),
        image_id,
        link,
        accent,
        year,
        featured: false,
        created_at: Utc::now().timestamp_millis(),
        created_by: "admin".to_string(),
        deleted_at: None,
        deleted_by: None,
    };

    let result = collection.insert_one(project).await;
    if let Err(error) = result {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    Ok(HttpResponse::Ok().content_type("application/json").json(ResponseBody { uuid, title }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_http_and_same_site_links_are_accepted() {
        assert!(valid_link("https://example.com/x"));
        assert!(valid_link("http://example.com"));
        assert!(valid_link("/projects/hyper"));

        // These are what the check exists for: an href the browser would
        // happily run, or one that leaves the site while looking local.
        assert!(!valid_link("javascript:alert(1)"));
        assert!(!valid_link("data:text/html,<script>alert(1)</script>"));
        assert!(!valid_link("//evil.example.com"));
        assert!(!valid_link("example.com"));
        assert!(!valid_link(""));
    }

    #[test]
    fn accents_are_hex_colours_and_nothing_else() {
        assert!(valid_accent("#DE4520"));
        assert!(valid_accent("#de4520"));
        assert!(valid_accent("#abc"));

        assert!(!valid_accent("red"));
        assert!(!valid_accent("#gggggg"));
        assert!(!valid_accent("#12345"));
        assert!(!valid_accent("DE4520"));
        // No escaping out of the style attribute.
        assert!(!valid_accent("#fff; background: url(javascript:alert(1))"));
        assert!(!valid_accent(""));
    }

    #[test]
    fn blank_optional_fields_read_as_absent() {
        assert_eq!(optional(&None), None);
        assert_eq!(optional(&Some("   ".to_string())), None);
        assert_eq!(optional(&Some("  2026 ".to_string())), Some("2026".to_string()));
    }
}
