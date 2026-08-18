use actix_web::web;
use crate::Handler;

pub fn router(cfg: &mut web::ServiceConfig) {
    cfg.service(
        // Auth-gated, dashboard-initiated — an API call.
        web::scope("/api/image")
        .route("/upload", web::post().to(Handler::Image::Upload::task))
    );
    cfg.service(
        // Serves image bytes/metadata back out — content routes, not API
        // endpoints, same reasoning as /documentation/*. Path shape (original/
        // webp/metadata split) mirrors velora_backend's src/routes/image.rs.
        web::scope("/image")
        .route("/original/{image_id}", web::get().to(Handler::Image::Original::task))
        .route("/webp/{image_id}", web::get().to(Handler::Image::Webp::task))
        .route("/metadata/{image_id}", web::get().to(Handler::Image::Metadata::task))
        .route("/metadata", web::post().to(Handler::Image::MetadataBulk::task))
    );
}
