use actix_web::{ HttpResponse, Responder };
use std::fs;

pub async fn handler() -> impl Responder {
    let content = match fs::read_to_string("sitemap.xml") {
        Ok(content) => content,
        Err(_) => return HttpResponse::NotFound().finish(),
    };

    HttpResponse::Ok()
        .content_type("application/xml; charset=utf-8")
        .body(content)
}
