use actix_web::web;
use crate::Handler;

// The zip goes over the wire as a JSON array of bytes (matches
// RequestBody.file: Vec<u8> in handler/documentation/create.rs), which runs
// several times larger than the raw file — actix's 2MB JSON default would
// reject anything but a trivial zip, so this scope gets a roomier limit.
const CREATE_DOC_JSON_LIMIT: usize = 64 * 1024 * 1024;

pub fn router(cfg: &mut web::ServiceConfig) {
    cfg.service(
        // JSON in/out — an actual API call, made from the dashboard.
        web::scope("/api/documentation")
        .app_data(web::JsonConfig::default().limit(CREATE_DOC_JSON_LIMIT))
        // POST and GET share the same "" path — both routes need to live on
        // one Resource (not two separate .route("") calls on the scope,
        // which registers two competing Resources for the same path).
        .service(
            web::resource("")
            .route(web::post().to(Handler::Documentation::Create::task))
            .route(web::get().to(Handler::Documentation::List::task))
        )
        // Public, unauthenticated — what the home page reads. Registered
        // before "/{uuid}/featured" so the literal path wins.
        .route("/feed", web::get().to(Handler::Documentation::Feed::task))
        .route(
            "/{uuid}/featured",
            web::patch().to(Handler::Documentation::ToggleFeatured::task)
        )
    );
    cfg.service(
        // Serves the unzipped doc site's own files (html/css/js) back out —
        // a browser navigates here directly, so it's a page/content route,
        // not an API endpoint, and stays out of /api.
        web::scope("/documentation")
        // Bare /documentation/{id} redirects to the trailing-slash form; the
        // site's own links are relative and resolve one level too high without
        // it. Registered first so it wins over the catch-all below.
        .route(
            "/{project}",
            web::get().to(Handler::Documentation::Get::root_redirect)
        )
        .route(
            "/{project}/{tail:.*}",
            web::get().to(Handler::Documentation::Get::task)
        )
    );
}
