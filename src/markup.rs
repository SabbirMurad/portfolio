use actix_session::Session;
use mongodb::bson::doc;
use crate::Model::Account;
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

pub async fn resume(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let res_data = template
        .render("resume.html", &Context::new())
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn hire(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let res_data = template
        .render("hire.html", &Context::new())
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn contact(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let res_data = template
        .render("contact.html", &Context::new())
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
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
