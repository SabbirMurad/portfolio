use actix_web::web;
use crate::Handler;

pub fn router(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/project")
        // POST and GET share the same "" path — one Resource, same reasoning
        // as routes/documentation.rs.
        .service(
            web::resource("")
            .route(web::post().to(Handler::Project::Create::task))
            .route(web::get().to(Handler::Project::List::task))
        )
        // Public, unauthenticated — what the home page and /projects read.
        // Registered before "/{uuid}/featured" so the literal path wins.
        .route("/feed", web::get().to(Handler::Project::Feed::task))
        .route(
            "/{uuid}/featured",
            web::patch().to(Handler::Project::ToggleFeatured::task)
        )
    );
}
