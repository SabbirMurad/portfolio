/*
 * The terminal client's own endpoints.
 *
 *   POST /api/cli/login    credentials -> a CLI token (public; this is how a
 *                          caller gets one)
 *   GET  /api/cli/whoami   who the presented token belongs to
 *   POST /api/cli/logout   revoke the presented token
 *
 *   GET  /install.sh       the installer (public)
 *   GET  /cli.sh           the client itself (public; also `sabbir upgrade`)
 *
 * whoami and logout go through require_cli, the same gate the shell execution
 * routes use, so `sabbir whoami` also serves as a check that the token in
 * ~/.config still works.
 */
pub mod script;
pub use script as Script;

pub mod login;
pub use login as Login;

pub mod whoami;
pub use whoami as Whoami;

pub mod logout;
pub use logout as Logout;
