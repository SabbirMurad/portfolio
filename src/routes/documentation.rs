use actix_web::web;
use crate::Handler;

pub fn router(cfg: &mut web::ServiceConfig) {
    cfg.service(
    web::scope("/documentation")
        .route(
            "",
            web::post().to(Handler::Documentation::Create::task)
        )
        .route(
            "/{project}/{tail:.*}",
            web::get().to(Handler::Documentation::Get::task)
        )
    );
}