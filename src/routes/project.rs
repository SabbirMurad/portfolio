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
        // Public too: what /projects/<slug> loads. Literal-first ordering
        // again — "/detail/{slug}" cannot collide with "/{uuid}/...".
        .route("/detail/{slug}", web::get().to(Handler::Project::Detail::task))
        .route(
            "/{uuid}/featured",
            web::patch().to(Handler::Project::ToggleFeatured::task)
        )
        // The long form behind a detail page. One resource, three verbs: the
        // dashboard reads the form, saves it whole, or takes the page down.
        .service(
            web::resource("/{uuid}/details")
            .route(web::get().to(Handler::Project::DetailsRead::task))
            .route(web::put().to(Handler::Project::DetailsUpsert::task))
            .route(web::delete().to(Handler::Project::DetailsDelete::task))
        )
    );
}
