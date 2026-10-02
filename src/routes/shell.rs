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
        // Administrator-only, from the dashboard: opens a bundle to ordinary
        // accounts. Registered before the {name} routes so "{name}" cannot
        // swallow it.
        .route(
            "/{uuid}/public-run",
            web::patch().to(Handler::Shell::TogglePublic::task)
        )
        // {name} is an uploaded bundle directory under SHELL_ROOT. These can
        // retrieve a bundle that may contain install/setup logic for some
        // other machine, so unlike the two routes above they take a CLI
        // token only — no session cookie, and nothing carrying browser fetch
        // metadata (src/middleware/auth.rs::require_cli).
        .route(
            "/{name}/targets",
            web::get().to(Handler::Shell::targets)
        )
        // Reads a text file and runs nothing, so — unlike the routes below —
        // it takes the dashboard's session (see Handler::Shell::readme).
        .route(
            "/{name}/readme.md",
            web::get().to(Handler::Shell::readme)
        )
        .route(
            "/{name}/describe/{target}",
            web::get().to(Handler::Shell::describe)
        )
        // The bundle itself, zipped. `ct shell run` downloads this and runs
        // main.sh locally — this server hands the bundle out, it doesn't run
        // it (see the module doc comment in handler/shell.rs for why).
        .route(
            "/{name}/download",
            web::get().to(Handler::Shell::download)
        )
    );
}
