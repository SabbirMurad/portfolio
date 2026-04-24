use actix_web::web;
use crate::Handler;

pub fn router(cfg: &mut web::ServiceConfig) {
    cfg.service(
    web::scope("/api/resume")
        .route(
            "",
            web::get().to(Handler::Resume::task)
        )
    );
}