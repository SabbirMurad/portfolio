use actix_web::{ HttpResponse, Responder };
use std::fs;

pub async fn handler() -> impl Responder {
    let content = match fs::read_to_string("robots.txt") {
        Ok(content) => content,
        Err(_) => return HttpResponse::NotFound().finish(),
    };

    HttpResponse::Ok()
        .content_type("text/plain; charset=utf-8")
        .body(content)
}
