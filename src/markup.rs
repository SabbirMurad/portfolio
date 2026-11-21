use actix_session::Session;
use mongodb::bson::doc;
use crate::Model::Account;
use crate::Model::Project::Project;
use crate::utils::slug::project_slug;
use futures_util::TryStreamExt;
use serde::Serialize;
use crate::Model::Resume::{ self as ResumeModel, ResumeVariant };
use crate::BuiltIns::mongo::MongoDB;
use actix_web::{error, web, Error, HttpResponse};
use tera::{Context, Tera};

pub async fn home(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    // The home page lists the featured projects, like its grid does; all of
    // them if none are flagged.
    let all = static_projects().await;
    let featured: Vec<StaticProject> = all.iter().filter(|p| p.featured).cloned().collect();

    let mut context = Context::new();
    context.insert("static_projects", if featured.is_empty() { &all } else { &featured });

    let res_data = template
        .render("home.html", &context)
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

/// A project as the server-rendered fallback lists it (pages/common/
/// static_page.html). The pages are client-rendered, so without this anything
/// that doesn't run JavaScript (link scrapers, recruiter tools, AI screeners)
/// saw a name and nothing else.
#[derive(Serialize, Clone)]
struct StaticProject {
    title: String,
    subtitle: String,
    description: String,
    tags: Vec<String>,
    link: Option<String>,
    // Absolute path of the detail page, when there is one.
    detail: Option<String>,
    featured: bool,
}

/// Same query and order as the public feed (src/handler/project/feed.rs).
/// A failure renders the page without the list rather than failing it.
async fn static_projects() -> Vec<StaticProject> {
    let db = MongoDB.connect();
    let cursor = db
        .collection::<Project>("project")
        .find(doc! { "deleted_at": null })
        .sort(doc! { "created_at": -1 })
        .await;

    let projects: Vec<Project> = match cursor {
        Ok(c) => match c.try_collect().await {
            Ok(v) => v,
            Err(error) => {
                log::error!("{:?}", error);
                return vec![];
            }
        },
        Err(error) => {
            log::error!("{:?}", error);
            return vec![];
        }
    };

    projects
        .into_iter()
        .map(|p| StaticProject {
            detail: p
                .details_id
                .as_ref()
                .map(|_| format!("/projects/{}", project_slug(&p.slug, &p.title))),
            title: p.title,
            subtitle: p.subtitle,
            description: p.description,
            tags: p.tags,
            link: p.link.filter(|l| !l.trim().is_empty()),
            featured: p.featured,
        })
        .collect()
}

pub async fn about(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let res_data = template
        .render("about.html", &Context::new())
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn documentations(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let res_data = template
        .render("documentations.html", &Context::new())
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn projects(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let mut context = Context::new();
    context.insert("static_projects", &static_projects().await);

    let res_data = template
        .render("projects.html", &context)
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

/// /projects/<slug>. The page itself is client-rendered like the rest of the
/// site, but the slug is known here, so canonical and og:url can name the
/// actual project instead of the shell. The API decides whether the slug
/// exists; a bad one renders the shell and the page shows its not-found
/// state.
pub async fn project_detail(
    template: web::Data<Tera>,
    path: web::Path<String>,
) -> Result<HttpResponse, Error> {
    let mut context = Context::new();
    context.insert("slug", &path.into_inner());

    let res_data = template
        .render("project.html", &context)
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

/// /resume and /resume_hidden each render whichever of résumé A and B the
/// dashboard's swap currently puts there (Résumé tab, stored by
/// src/handler/resume/set_swap.rs). By default A is at /resume, B at
/// /resume_hidden.
///
/// SEO follows the address, not the template: whatever is at /resume is
/// indexable with /resume as its canonical; whatever is at /resume_hidden is
/// a link to hand out, not a page to be found — noindex, and left out of the
/// sitemap.
pub async fn resume(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let swapped = crate::Handler::Resume::is_swapped().await;

    let mut context = Context::new();
    context.insert("seo_path", "/resume");

    render_resume(&template, ResumeModel::at_resume(swapped), &context)
}

pub async fn resume_hidden(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let swapped = crate::Handler::Resume::is_swapped().await;

    let mut context = Context::new();
    context.insert("seo_path", "/resume_hidden");
    context.insert("seo_robots", "noindex, nofollow");

    render_resume(&template, ResumeModel::at_resume_hidden(swapped), &context)
}

fn render_resume(
    template: &Tera,
    variant: ResumeVariant,
    context: &Context,
) -> Result<HttpResponse, Error> {
    let res_data = template
        .render(variant.template(), context)
        .map_err(|e| error::ErrorInternalServerError(e))?;

    // The swap can happen at any moment from the dashboard, so neither a
    // browser nor a proxy should hold on to whichever one it saw last.
    Ok(HttpResponse::Ok()
        .content_type("text/html")
        .insert_header(("Cache-Control", "no-cache"))
        .body(res_data))
}

/// `/hire` and `/contact` used to render templates of their own. Those pages
/// were folded into the home page long ago and the templates went with them,
/// so both routes answered 500 — the worst thing to hand a crawler, and worse
/// than a 404. The content they promised lives at #contact, so they redirect
/// there permanently and any link still pointing here keeps working.
fn to_contact_anchor() -> HttpResponse {
    HttpResponse::MovedPermanently()
        .append_header(("Location", "/#contact"))
        .finish()
}

pub async fn hire() -> HttpResponse {
    to_contact_anchor()
}

pub async fn contact() -> HttpResponse {
    to_contact_anchor()
}

pub async fn sign_in(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let res_data = template
        .render("sign_in.html", &Context::new())
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn sign_up(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let res_data = template
        .render("sign_up.html", &Context::new())
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

// Only reachable with a live session (see src/handler/auth/sign_in.rs, which
// sets `user_id` on the cookie session on a successful sign-in) — anyone else
// gets bounced back to /admin/sign-in before the template even renders.
pub async fn dashboard(template: web::Data<Tera>, session: Session) -> Result<HttpResponse, Error> {
    let user_id: Option<String> = session.get("user_id").unwrap_or(None);

    let user_id = match user_id {
        Some(id) => id,
        None => {
            return Ok(HttpResponse::Found()
                .append_header(("Location", "/admin/sign-in"))
                .finish());
        }
    };

    let db = MongoDB.connect();
    let collection = db.collection::<Account::AccountProfile>("account_profile");
    let profile = collection.find_one(doc! { "uuid": &user_id }).await
        .map_err(|e| error::ErrorInternalServerError(e))?;

    let full_name = profile
        .map(|p| p.full_name)
        .unwrap_or_else(|| "Admin".to_string());

    let mut ctx = Context::new();
    ctx.insert("full_name", &full_name);

    let res_data = template
        .render("dashboard.html", &ctx)
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}
