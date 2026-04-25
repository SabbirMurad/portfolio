use tera::{Tera, Context};
use actix_web::{web, error, Error, HttpResponse};

pub async fn home(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
  let res_data = template.render(
    "home.html",
    &Context::new()
  )
  .map_err(|e|error::ErrorInternalServerError(e))?;
  
  Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn about(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
  let res_data = template.render(
    "about.html",
    &Context::new()
  )
  .map_err(|e|error::ErrorInternalServerError(e))?;

  Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn documentations(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
  let res_data = template.render(
    "documentations.html",
    &Context::new()
  )
  .map_err(|e|error::ErrorInternalServerError(e))?;

  Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn hire(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
  let res_data = template.render(
    "hire.html",
    &Context::new()
  )
  .map_err(|e|error::ErrorInternalServerError(e))?;
  
  Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn contact(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
  let res_data = template.render(
    "contact.html",
    &Context::new()
  )
  .map_err(|e|error::ErrorInternalServerError(e))?;
  
  Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn sign_in(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
  let res_data = template.render(
    "sign_in.html",
    &Context::new()
  )
  .map_err(|e|error::ErrorInternalServerError(e))?;

  Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}