use actix_web::web;
use crate::Handler;

pub fn router(cfg: &mut web::ServiceConfig) {
    cfg.service(
    web::scope("/api/resume")
        .route(
            "",
            web::get().to(Handler::Resume::task)
        )
        // Whether résumés A and B are swapped — set from the dashboard.
        .service(
            web::resource("/swap")
            .route(web::get().to(Handler::Resume::GetSwap::task))
            .route(web::post().to(Handler::Resume::SetSwap::task))
        )
    );
}
