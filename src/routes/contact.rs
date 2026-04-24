use actix_web::web;
use crate::Handler;

pub fn router(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/contact")
            .route("", web::post().to(Handler::Contact::Send::task))
        .route("/list", web::get().to(Handler::Contact::List::task))
    );
}
