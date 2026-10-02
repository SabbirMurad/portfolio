/*
 * Distribution point for uploaded shell bundles — scripts meant to run on
 * some OTHER machine (a fresh VPS being provisioned, say), not on this
 * server. This module hands a bundle's files to whoever is authorized for
 * it; it never executes them itself. `ct shell run` (assets/cli/ct.sh)
 * downloads the bundle from /download and runs its main.sh locally, in the
 * caller's own terminal, so prompts, output and `set -e` all behave exactly
 * like running the scripts by hand after copying them over — because that is
 * effectively what's happening, just authenticated and over HTTP instead of
 * a copied .zip. A bundle named vps-setup's common.sh still reads and writes
 * /etc/vps-setup/vars.env, but now that's a path on the machine `ct` is
 * running on, which is the whole point: this server was never the thing
 * vps-setup was provisioning.
 *
 * A bundle is an uploaded directory of shell scripts (see shell/create.rs)
 * exposing this CLI through its own main.sh:
 *
 *   main.sh --list                 print the targets, in run order
 *   main.sh --describe <target>    print the variables that target needs
 *   main.sh <target>               run it (--full, a step name, or
 *                                  <step>-onwards)
 *
 * targets, describe and download can all be used to learn about or retrieve
 * a bundle that may contain install/setup logic for a machine elsewhere, so
 * they go through `require_cli` — a CLI token from /api/cli/login, presented
 * as a bearer header, and nothing else. The dashboard's session cookie is
 * not accepted, and a request carrying browser fetch metadata is refused —
 * so no page on this origin can reach them, signed in as an administrator or
 * not. See src/middleware/auth.rs for what that does and does not prove.
 *
 * Uploading and listing bundles (shell/create.rs, shell/list.rs) are
 * ordinary dashboard operations and stay off this stricter gate — list.rs
 * and readme below both go through require_access_or_cli instead.
 *
 *   GET  /api/shell/{name}/targets            the step list, in run order
 *   GET  /api/shell/{name}/describe/{target}  variables a target needs,
 *                                             without touching anything
 *   GET  /api/shell/{name}/download           the bundle itself, as a zip —
 *                                             what `ct shell run` fetches
 *                                             and executes locally
 *   GET  /api/shell/{name}/readme.md          the bundle's own README, if it
 *                                             has one — text/markdown, .md
 *                                             on the URL so the dashboard's
 *                                             link opens it as a file (and a
 *                                             markdown-viewer extension picks
 *                                             it up) rather than fetching it
 *
 * readme is the one exception to the CLI-only rule above: it reads a text
 * file and runs nothing, so — like list.rs — it takes require_access_or_cli
 * rather than require_cli.
 */
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use mongodb::bson::doc;

use actix_web::{web, Error, HttpRequest, HttpResponse};

use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access_or_cli, require_cli, AccessRequirement};
use crate::Model::Account::AccountRole;
use crate::Model::Shell::ShellBundle;
use crate::utils::{archive, response::Response};

pub mod create;
pub use create as Create;

pub mod list;
pub use list as List;

pub mod toggle_public;
pub use toggle_public as TogglePublic;

/// Where uploaded bundles are unpacked, relative to the process working
/// directory. Created on demand — nothing is checked in here, so on a fresh
/// deploy it stays empty until the first upload.
const SHELL_ROOT: &str = "./shell";

/* ── routes ── */

pub async fn targets(req: HttpRequest, path: web::Path<String>) -> Result<HttpResponse, Error> {
    let bundle = path.into_inner();
    if let Err(res) = authorize(&req, &bundle).await {
        return Ok(res);
    }

    let dir = match bundle_dir(&bundle) {
        Ok(dir) => dir,
        Err(res) => return Ok(res),
    };

    let targets = match list_targets(&dir) {
        Ok(targets) => targets,
        Err(error) => return Ok(Response::internal_server_error(&error)),
    };

    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .json(serde_json::json!({ "targets": targets })))
}

pub async fn describe(
    req: HttpRequest,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, Error> {
    let (bundle, target) = path.into_inner();
    if let Err(res) = authorize(&req, &bundle).await {
        return Ok(res);
    }

    let dir = match bundle_dir(&bundle) {
        Ok(dir) => dir,
        Err(res) => return Ok(res),
    };
    if !is_valid_target(&target) {
        return Ok(Response::bad_request("Invalid target name"));
    }

    // main.sh answers non-zero for an unknown target, so this is a 400 rather
    // than a 500 — the caller asked about something that doesn't exist.
    let out = match run_sync(&dir, &["--describe", &target]) {
        Ok(out) => out,
        Err(error) => return Ok(Response::bad_request(&error)),
    };

    let vars: Vec<String> = out
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();

    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .json(serde_json::json!({ "vars": vars })))
}

/// The bundle itself, zipped — what `ct shell run` downloads before running
/// main.sh locally. See the module doc comment for why this server hands the
/// bundle out rather than running it.
pub async fn download(req: HttpRequest, path: web::Path<String>) -> Result<HttpResponse, Error> {
    let bundle = path.into_inner();
    if let Err(res) = authorize(&req, &bundle).await {
        return Ok(res);
    }

    let dir = match bundle_dir(&bundle) {
        Ok(dir) => dir,
        Err(res) => return Ok(res),
    };

    let bytes = match archive::zip_dir(&dir) {
        Ok(bytes) => bytes,
        Err(error) => return Ok(Response::internal_server_error(&error)),
    };

    Ok(HttpResponse::Ok()
        .content_type("application/zip")
        .append_header((
            "Content-Disposition",
            format!("attachment; filename=\"{}.zip\"", bundle),
        ))
        .body(bytes))
}

/// A bundle's own README, if it uploaded with one. text/markdown, and the
/// route itself ends in .md — the dashboard links straight to this route
/// (opens in a new tab) rather than fetching it, so there is no JSON wrapper
/// to unwrap, and a markdown-viewer browser extension has both the content
/// type and the file extension to recognize it by.
pub async fn readme(req: HttpRequest, path: web::Path<String>) -> Result<HttpResponse, Error> {
    let bundle = path.into_inner();
    // Same gate as list.rs: this reads a text file and runs nothing, so it
    // doesn't warrant require_cli's stricter, browser-refusing gate. A plain
    // link click is a top-level navigation, not a fetch, so it carries the
    // session's access_token cookie the same as any other page on this site.
    require_access_or_cli(&req, AccessRequirement::Role(AccountRole::Administrator)).await?;

    let dir = match bundle_dir(&bundle) {
        Ok(dir) => dir,
        Err(res) => return Ok(res),
    };

    match readme_path(&dir) {
        Some(path) => {
            let content = fs::read_to_string(&path).unwrap_or_default();
            Ok(HttpResponse::Ok()
                .content_type("text/markdown; charset=utf-8")
                .body(content))
        }
        None => Ok(Response::not_found("This bundle has no README")),
    }
}

/* ── internals ── */

/// SHELL_ROOT, created if it isn't there yet, canonicalized so callers can
/// compare paths against it.
pub fn shell_root() -> Result<PathBuf, String> {
    let root = Path::new(SHELL_ROOT);
    fs::create_dir_all(root).map_err(|e| format!("{}: {}", SHELL_ROOT, e))?;
    root.canonicalize()
        .map_err(|e| format!("{}: {}", SHELL_ROOT, e))
}

/// The target names a bundle exposes, read from its own `main.sh --list`.
pub fn list_targets(dir: &Path) -> Result<Vec<String>, String> {
    let out = run_sync(dir, &["--list"])?;
    // Drop the "Available targets, in run order:" header main.sh prints first.
    Ok(out
        .lines()
        .skip(1)
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect())
}

/// The gate every route that exposes bundle internals runs: a valid CLI
/// token, then permission to use *this* bundle.
///
/// An Administrator may use any bundle. An ordinary User may use only a
/// bundle someone has marked `public_run` from the dashboard — uploading a
/// bundle does not expose it. A downloaded bundle can install packages,
/// create system users, rewrite sshd_config and otherwise provision whatever
/// machine it's run on, so the decision to open one up is per bundle and
/// explicit, same as before this server stopped running them itself.
async fn authorize(req: &HttpRequest, bundle: &str) -> Result<(), HttpResponse> {
    let user = match require_cli(
        req,
        AccessRequirement::AnyOf(vec![AccountRole::Administrator, AccountRole::User]),
    )
    .await
    {
        Ok(user) => user,
        Err(error) => return Err(error.error_response()),
    };

    if user.role == AccountRole::Administrator {
        return Ok(());
    }

    let db = MongoDB.connect();
    let collection = db.collection::<ShellBundle>("shell_bundle");

    let found = collection
        .find_one(doc! { "name": bundle, "deleted_at": null })
        .await;

    match found {
        Ok(Some(record)) if record.public_run => Ok(()),
        Ok(Some(_)) => Err(Response::forbidden(
            "This bundle is not open to ordinary accounts",
        )),
        Ok(None) => Err(Response::not_found("No such shell bundle")),
        Err(error) => {
            log::error!("{:?}", error);
            Err(Response::internal_server_error(&error.to_string()))
        }
    }
}

/// Resolve a bundle name to its directory, or the response explaining why not.
///
/// The name is validated, then the resolved path is canonicalized and checked
/// to still sit under SHELL_ROOT — the check that actually contains it, rather
/// than trusting the string that came off the wire.
fn bundle_dir(name: &str) -> Result<PathBuf, HttpResponse> {
    if !is_valid_bundle(name) {
        return Err(Response::bad_request("Invalid bundle name"));
    }

    let root = match Path::new(SHELL_ROOT).canonicalize() {
        Ok(root) => root,
        Err(_) => return Err(Response::not_found("No shell bundles are installed")),
    };

    let dir = match root.join(name).canonicalize() {
        Ok(dir) => dir,
        Err(_) => return Err(Response::not_found("No such shell bundle")),
    };

    if !dir.starts_with(&root) || !dir.is_dir() {
        return Err(Response::not_found("No such shell bundle"));
    }
    // Without a main.sh there is nothing here this API knows how to drive.
    if !dir.join("main.sh").is_file() {
        return Err(Response::not_found("That bundle has no main.sh"));
    }

    Ok(dir)
}

/// The bundle's README file, if it has one directly at its root — checked
/// under a couple of common spellings since an uploader won't always use the
/// canonical capitalization.
fn readme_path(dir: &Path) -> Option<PathBuf> {
    ["README.md", "README", "readme.md", "Readme.md"]
        .iter()
        .map(|name| dir.join(name))
        .find(|path| path.is_file())
}

/// Whether a freshly-unpacked bundle has a README — read once at upload time
/// (shell/create.rs) and cached on the ShellBundle document, the same way its
/// targets are, so the dashboard doesn't hit the filesystem to decide whether
/// to show the button.
pub fn has_readme(dir: &Path) -> bool {
    readme_path(dir).is_some()
}

/// A single path segment: no separators, no traversal, no leading dash that
/// bash would read as a flag.
pub fn is_valid_bundle(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 64
        && name != "."
        && name != ".."
        && !name.starts_with('-')
        && !name.starts_with('.')
        && name
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '_')
}

/// "--full", "sshd-config", "certbot-onwards". The value is passed to bash as
/// its own argv entry so there is no shell to inject into, but keeping the
/// vocabulary tight means an unknown target fails here with a clear message
/// rather than somewhere inside the script.
fn is_valid_target(target: &str) -> bool {
    if target == "--full" {
        return true;
    }
    !target.is_empty()
        && target.len() <= 64
        && target
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        && !target.starts_with('-')
}

/// Runs a read-only main.sh query (--list / --describe) and captures its
/// output. Used only for introspection — actually running a target happens
/// on whatever machine downloads the bundle, not here.
fn run_sync(dir: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("bash")
        .arg("main.sh")
        .args(args)
        .current_dir(dir)
        .stdin(Stdio::null())
        .output()
        .map_err(|e| format!("could not run main.sh: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if err.is_empty() {
            format!("main.sh exited with {}", output.status)
        } else {
            err
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn target_vocabulary_matches_main_sh() {
        assert!(is_valid_target("--full"));
        assert!(is_valid_target("sshd-config"));
        assert!(is_valid_target("certbot-onwards"));
        assert!(is_valid_target("mongodb-install"));

        assert!(!is_valid_target(""));
        assert!(!is_valid_target("../../etc/passwd"));
        assert!(!is_valid_target("sshd config"));
        assert!(!is_valid_target("--list"));
        assert!(!is_valid_target("Certbot"));
        assert!(!is_valid_target("a; rm -rf /"));
    }

    #[test]
    fn bundle_names_are_a_single_safe_segment() {
        assert!(is_valid_bundle("vps-setup"));
        assert!(is_valid_bundle("deploy_2"));

        assert!(!is_valid_bundle(""));
        assert!(!is_valid_bundle(".."));
        assert!(!is_valid_bundle("."));
        assert!(!is_valid_bundle(".hidden"));
        assert!(!is_valid_bundle("-rf"));
        assert!(!is_valid_bundle("a/b"));
        assert!(!is_valid_bundle(r"a\b"));
        assert!(!is_valid_bundle("../etc"));
        assert!(!is_valid_bundle("VpsSetup"));
    }

    /// Proves the path resolution actually works, rather than only that bad
    /// names are refused. Builds its own bundle under SHELL_ROOT, since nothing
    /// is checked in there — uploads are the only way one arrives.
    #[test]
    fn a_bundle_on_disk_resolves() {
        let name = "zz-test-bundle";
        let dir = Path::new(SHELL_ROOT).join(name);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("main.sh"), "#!/usr/bin/env bash
").unwrap();

        let resolved = bundle_dir(name).expect("a bundle with a main.sh should resolve");
        assert!(resolved.join("main.sh").is_file());
        assert!(resolved.ends_with(name));

        // Without a main.sh it is not a bundle this API can drive.
        fs::remove_file(dir.join("main.sh")).unwrap();
        assert!(bundle_dir(name).is_err(), "a directory with no main.sh resolved");

        fs::remove_dir_all(&dir).ok();
    }
}

#[cfg(test)]
mod route_tests {
    use super::*;
    use crate::builtins::jwt;
    use crate::routes;
    use actix_web::{test, App};

    /// Mint an access token the middleware will accept, using the same env key
    /// it verifies against.
    fn token(role: AccountRole) -> String {
        std::env::set_var("JWT_LOCAL_ACCESS_KEY", "test-key-for-vps-setup-routes-0000");
        jwt::access_token::generate_default("test-admin", role)
    }

    /// The execution-adjacent routes take a CLI token and nothing else. This
    /// asserts the refusal that happens *before* the token is looked up, so
    /// it needs no database — what happens past the gate is covered by the
    /// unit tests above.
    #[actix_web::test]
    async fn execution_routes_refuse_callers_with_no_credential() {
        let app = test::init_service(App::new().configure(routes::shell::router)).await;

        let paths = [
            "/api/shell/vps-setup/targets",
            "/api/shell/vps-setup/describe/ufw",
            "/api/shell/vps-setup/download",
        ];

        for path in paths {
            let res =
                test::call_service(&app, test::TestRequest::get().uri(path).to_request()).await;
            assert_eq!(res.status(), 401, "{} was reachable with no credential", path);
        }
    }

    /// Fetch metadata is set by the browser itself and page script cannot strip
    /// it, so its presence is refused before the token is even considered —
    /// including when a bearer header is also present.
    #[actix_web::test]
    async fn requests_carrying_browser_metadata_are_refused() {
        let app = test::init_service(App::new().configure(routes::shell::router)).await;

        for header in ["Sec-Fetch-Mode", "Sec-Fetch-Site", "Sec-Fetch-Dest", "Origin"] {
            let res = test::call_service(
                &app,
                test::TestRequest::get()
                    .uri("/api/shell/vps-setup/targets")
                    .insert_header((header, "cors"))
                    .insert_header(("Authorization", "Bearer whatever"))
                    .to_request(),
            )
            .await;
            assert_eq!(
                res.status(),
                403,
                "{} did not mark the call as coming from a browser",
                header
            );
        }
    }
}
