use actix_web::web;
use crate::Handler;

// The zip goes over the wire as a JSON array of bytes (RequestBody.file:
// Vec<u8> in handler/shell/create.rs), which runs several times larger than
// the raw file — actix's 2MB JSON default would reject anything but a trivial
// bundle.
const CREATE_JSON_LIMIT: usize = 32 * 1024 * 1024;

pub fn router(cfg: &mut web::ServiceConfig) {
    // One scope for the lot. Splitting "/api/shell" and "/api/shell/{name}"
    // into two scopes doesn't work: a scope matches on its prefix, so the
    // shorter one swallows every deeper path and answers 404 for routes it
    // doesn't define.
    cfg.service(
        web::scope("/api/shell")
        .app_data(web::JsonConfig::default().limit(CREATE_JSON_LIMIT))
        // Upload a bundle, and list the ones installed.
        .service(
            web::resource("")
            .route(web::post().to(Handler::Shell::Create::task))
            .route(web::get().to(Handler::Shell::List::task))
        )
        // {name} is a bundle directory under SHELL_ROOT. Every route below is
        // gated on an Administrator session inside the handlers
        // (src/handler/shell.rs); these run root shell scripts on the host.
        .route(
            "/{name}/targets",
            web::get().to(Handler::Shell::targets)
        )
        .route(
            "/{name}/describe/{target}",
            web::get().to(Handler::Shell::describe)
        )
        .route(
            "/{name}/run/{target}",
            web::post().to(Handler::Shell::run)
        )
        // The more specific path has to come before /jobs/{id}, otherwise
        // "{id}" swallows "some-id/logs".
        .route(
            "/{name}/jobs/{id}/logs",
            web::get().to(Handler::Shell::job_logs)
        )
        .route(
            "/{name}/jobs/{id}",
            web::get().to(Handler::Shell::job)
        )
    );
}
