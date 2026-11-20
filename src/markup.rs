use actix_session::Session;
use mongodb::bson::doc;
use crate::Model::Account;
use crate::Model::Resume::{ self as ResumeModel, ResumeVariant };
use crate::BuiltIns::mongo::MongoDB;
use actix_web::{error, web, Error, HttpResponse};
use tera::{Context, Tera};

pub async fn home(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let res_data = template
        .render("home.html", &Context::new())
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
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
    let res_data = template
        .render("projects.html", &Context::new())
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
