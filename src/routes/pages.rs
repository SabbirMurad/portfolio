use actix_web::web;
use crate::Markup;

pub fn router(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("")
        .route(
            "/",
            web::get().to(Markup::home)
        )
    );
}