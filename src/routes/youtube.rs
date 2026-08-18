use actix_web::web;
use crate::Handler;

pub fn router(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/youtube")
            .route("/feed", web::get().to(Handler::Youtube::Feed::task))
            .service(
                web::resource("/featured")
                .route(web::get().to(Handler::Youtube::GetFeatured::task))
                .route(web::post().to(Handler::Youtube::SetFeatured::task))
            )
    );
}
