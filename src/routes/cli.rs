use actix_web::web;
use crate::Handler;

pub fn router(cfg: &mut web::ServiceConfig) {
    // Root paths so the install line stays short enough to read out loud:
    //   curl -fsSL https://sabbirhassan.com/install.sh | bash
    // Registered before Routes::Pages, whose scope("") would otherwise claim
    // them. Neither carries a secret, so neither is gated.
    cfg.route("/install.sh", web::get().to(Handler::Cli::Script::install));
    cfg.route("/cli.sh", web::get().to(Handler::Cli::Script::client));

    cfg.service(
        web::scope("/api/cli")
        // Public: this is how a terminal gets a credential in the first place.
        // The password check is the same one browser sign-in runs.
        .route(
            "/login",
            web::post().to(Handler::Cli::Login::task)
        )
        // Both go through require_cli, so they also serve as a check that the
        // token on disk is still valid.
        .route(
            "/whoami",
            web::get().to(Handler::Cli::Whoami::task)
        )
        .route(
            "/logout",
            web::post().to(Handler::Cli::Logout::task)
        )
    );
}
