/*
 * Remote driver for an uploaded shell bundle — the Rust port of what
 * shell/vps-setup/api/server.js (now deleted) did in node, generalised from the
 * one hardcoded vps-setup directory to any bundle under SHELL_ROOT.
 *
 * A bundle is a directory of shell scripts with a `main.sh` exposing the CLI
 * that shell/vps-setup/main.sh does:
 *
 *   main.sh --list                 print the targets, in run order
 *   main.sh --describe <target>    print the variables that target needs
 *   main.sh <target>               run it (--full, a step name, or
 *                                  <step>-onwards)
 *
 * and reading its collected variables from /etc/<bundle>/vars.env — that
 * convention is what lets the server write them without knowing anything about
 * a given bundle's internals. For the checked-in bundle that resolves to the
 * /etc/vps-setup/vars.env its common.sh already uses.
 *
 * Every route here can install packages, create system users, rewrite
 * sshd_config and run root shell scripts on whatever machine this binary is
 * running on. That is the whole point of it, and it is also why every route
 * goes through require_access(Administrator) rather than the standalone
 * x-api-key the node version used: the dashboard session is already the
 * strongest credential this server has, and one gate is easier to reason about
 * than two.
 *
 *   GET  /api/shell/{name}/targets            the step list, in run order
 *   GET  /api/shell/{name}/describe/{target}  variables a target needs,
 *                                             without running anything
 *   POST /api/shell/{name}/run/{target}       { vars: { KEY: "value" } }
 *                                             -> 202 { id, ... }
 *   GET  /api/shell/{name}/jobs/{id}          status
 *   GET  /api/shell/{name}/jobs/{id}/logs     combined output, text/plain
 *
 * main.sh reports anything it still needs as a "MISSING_VARS:a,b,c" line and
 * exits before touching the system, which is what surfaces as the
 * failed_missing_vars status below.
 */
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Mutex, OnceLock};

use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use actix_web::{web, Error, HttpRequest, HttpResponse};

use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::Model::Account::AccountRole;
use crate::utils::response::Response;

pub mod create;
pub use create as Create;

pub mod list;
pub use list as List;

/// Where bundles live, relative to the process working directory. The
/// checked-in shell/vps-setup is just the first one; uploads land beside it.
const SHELL_ROOT: &str = "./shell";
/// Job logs, outside the bundle tree so a run doesn't dirty the working copy.
const LOG_DIR: &str = "./logs/shell";

#[derive(Debug, Clone, Serialize)]
pub struct Job {
    pub id: String,
    /// Which bundle under SHELL_ROOT this ran, so one bundle's job ids can't
    /// be used to read another's logs.
    pub bundle: String,
    pub target: String,
    /// running | success | failed | failed_missing_vars
    pub status: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub exit_code: Option<i32>,
    pub missing_vars: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct RunBody {
    #[serde(default)]
    pub vars: HashMap<String, String>,
}

/// In-memory, exactly like the node version — a restart forgets past runs. The
/// logs on disk outlive it.
fn jobs() -> &'static Mutex<HashMap<String, Job>> {
    static JOBS: OnceLock<Mutex<HashMap<String, Job>>> = OnceLock::new();
    JOBS.get_or_init(|| Mutex::new(HashMap::new()))
}

/* ── routes ── */

pub async fn targets(req: HttpRequest, path: web::Path<String>) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let bundle = path.into_inner();
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
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let (bundle, target) = path.into_inner();
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

pub async fn run(
    req: HttpRequest,
    path: web::Path<(String, String)>,
    body: Option<web::Json<RunBody>>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let (bundle, target) = path.into_inner();
    let dir = match bundle_dir(&bundle) {
        Ok(dir) => dir,
        Err(res) => return Ok(res),
    };
    if !is_valid_target(&target) {
        return Ok(Response::bad_request("Invalid target name"));
    }

    if let Some(body) = &body {
        if !body.vars.is_empty() {
            if let Err(error) = write_vars(&bundle, &body.vars) {
                return Ok(Response::bad_request(&error));
            }
        }
    }

    let job = match start_job(&bundle, &dir, &target) {
        Ok(job) => job,
        Err(error) => return Ok(Response::internal_server_error(&error)),
    };

    Ok(HttpResponse::Accepted()
        .content_type("application/json")
        .json(job))
}

pub async fn job(
    req: HttpRequest,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let (bundle, id) = path.into_inner();
    match lookup(&bundle, &id) {
        Some(job) => Ok(HttpResponse::Ok().content_type("application/json").json(job)),
        None => Ok(Response::not_found("No such job")),
    }
}

pub async fn job_logs(
    req: HttpRequest,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let (bundle, id) = path.into_inner();
    if lookup(&bundle, &id).is_none() {
        return Ok(Response::not_found("No such job"));
    }

    // The id came out of the registry, so it is a uuid this process minted —
    // it can't reach outside LOG_DIR.
    let body = fs::read_to_string(log_path(&id)).unwrap_or_default();
    Ok(HttpResponse::Ok()
        .content_type("text/plain; charset=utf-8")
        .body(body))
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

/// The vars file a bundle's scripts read, by convention.
fn vars_file(bundle: &str) -> PathBuf {
    Path::new("/etc").join(bundle).join("vars.env")
}

/// A job, but only if it belongs to this bundle.
fn lookup(bundle: &str, id: &str) -> Option<Job> {
    jobs()
        .lock()
        .ok()?
        .get(id)
        .filter(|job| job.bundle == bundle)
        .cloned()
}

fn log_path(id: &str) -> PathBuf {
    Path::new(LOG_DIR).join(format!("{}.log", id))
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

/// Read-only routes run the script straight through and capture its output;
/// they don't touch the system, so they don't need the job machinery.
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

/// Write KEY="value" lines into the shared vars file, replacing any existing
/// entry for the same key — the same file, and the same shape, that common.sh's
/// `save_var` writes.
/// A name bash will accept as a variable, and a value that can't smuggle extra
/// assignments in. The node version escaped quotes but not newlines, so a value
/// could append arbitrary lines to the env file.
fn check_var(key: &str, value: &str) -> Result<(), String> {
    let valid_name = !key.is_empty()
        && key
            .chars()
            .next()
            .map(|c| c.is_ascii_alphabetic() || c == '_')
            .unwrap_or(false)
        && key.chars().all(|c| c.is_ascii_alphanumeric() || c == '_');

    if !valid_name {
        return Err(format!("invalid variable name: {}", key));
    }
    if value.contains('\n') || value.contains('\r') {
        return Err(format!("value for {} may not contain newlines", key));
    }
    Ok(())
}

fn write_vars(bundle: &str, vars: &HashMap<String, String>) -> Result<(), String> {
    // Validate the whole batch first: a bad key shouldn't leave /etc/vps-setup
    // created and half the values written.
    for (key, value) in vars {
        check_var(key, value)?;
    }

    let path = vars_file(bundle);
    let path = path.as_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("{}: {}", parent.display(), e))?;
    }

    let mut lines: Vec<String> = fs::read_to_string(path)
        .unwrap_or_default()
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.to_string())
        .collect();

    for (key, value) in vars {
        let prefix = format!("{}=", key);
        lines.retain(|l| !l.starts_with(&prefix));
        lines.push(format!("{}=\"{}\"", key, value.replace('\\', "\\\\").replace('"', "\\\"")));
    }

    let mut body = lines.join("\n");
    body.push('\n');
    fs::write(path, body).map_err(|e| format!("{}: {}", path.display(), e))
}

fn start_job(bundle: &str, dir: &Path, target: &str) -> Result<Job, String> {
    fs::create_dir_all(LOG_DIR).map_err(|e| format!("{}: {}", LOG_DIR, e))?;

    let id = Uuid::now_v7().to_string();
    let path = log_path(&id);
    let log = fs::File::create(&path).map_err(|e| format!("{}: {}", path.display(), e))?;
    let log_err = log.try_clone().map_err(|e| e.to_string())?;

    let job = Job {
        id: id.clone(),
        bundle: bundle.to_string(),
        target: target.to_string(),
        status: "running".to_string(),
        started_at: Utc::now().to_rfc3339(),
        finished_at: None,
        exit_code: None,
        missing_vars: None,
    };

    // stdin is null, which is what puts main.sh in its non-interactive mode:
    // rather than blocking on a prompt it reports MISSING_VARS and stops.
    let child = Command::new("bash")
        .arg("main.sh")
        .arg(target)
        .current_dir(dir)
        .stdin(Stdio::null())
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(log_err))
        .spawn();

    let mut child = match child {
        Ok(c) => c,
        Err(e) => {
            let _ = fs::write(&path, format!("Failed to spawn: {}\n", e));
            return Err(format!("could not start main.sh: {}", e));
        }
    };

    if let Ok(mut map) = jobs().lock() {
        map.insert(id.clone(), job.clone());
    }

    // A setup run takes minutes; waiting on it in a worker thread would block
    // the runtime, so it is watched on a thread of its own and the registry
    // updated when it exits.
    let watch_id = id.clone();
    std::thread::spawn(move || {
        let status = child.wait();
        let log_text = fs::read_to_string(log_path(&watch_id)).unwrap_or_default();

        let (state, code, missing) = match status {
            Ok(status) if status.success() => ("success", status.code(), None),
            Ok(status) => match missing_vars(&log_text) {
                Some(vars) => ("failed_missing_vars", status.code(), Some(vars)),
                None => ("failed", status.code(), None),
            },
            Err(e) => {
                if let Ok(mut f) = fs::OpenOptions::new().append(true).open(log_path(&watch_id)) {
                    let _ = writeln!(f, "\nFailed while waiting: {}", e);
                }
                ("failed", None, None)
            }
        };

        if let Ok(mut map) = jobs().lock() {
            if let Some(entry) = map.get_mut(&watch_id) {
                entry.status = state.to_string();
                entry.exit_code = code;
                entry.missing_vars = missing;
                entry.finished_at = Some(Utc::now().to_rfc3339());
            }
        }
    });

    Ok(job)
}

/// main.sh prints "MISSING_VARS:a,b,c" when a non-interactive run can't collect
/// something it needs.
fn missing_vars(log: &str) -> Option<Vec<String>> {
    let line = log.lines().find(|l| l.contains("MISSING_VARS:"))?;
    let list = line.split("MISSING_VARS:").nth(1)?;
    let vars: Vec<String> = list
        .split(',')
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .collect();
    if vars.is_empty() {
        None
    } else {
        Some(vars)
    }
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

    /// The one case that proves the path resolution actually works, rather
    /// than only that bad names are refused.
    #[test]
    fn the_checked_in_bundle_resolves() {
        let dir = bundle_dir("vps-setup").expect("shell/vps-setup should resolve");
        assert!(dir.join("main.sh").is_file());
        assert!(dir.ends_with("vps-setup"));
    }

    #[test]
    fn vars_file_follows_the_bundle_name() {
        assert_eq!(
            vars_file("vps-setup"),
            Path::new("/etc").join("vps-setup").join("vars.env")
        );
    }

    #[test]
    fn write_vars_rejects_what_would_corrupt_the_env_file() {
        let mut vars = HashMap::new();
        vars.insert("2bad".to_string(), "x".to_string());
        assert!(write_vars("vps-setup", &vars).is_err(), "a name starting with a digit");

        let mut vars = HashMap::new();
        vars.insert("has space".to_string(), "x".to_string());
        assert!(write_vars("vps-setup", &vars).is_err(), "a name with a space");

        // The node version escaped quotes but not newlines, which let a value
        // append arbitrary extra assignments to the file.
        let mut vars = HashMap::new();
        vars.insert("ok_name".to_string(), "a\"b\nnew_username=root".to_string());
        assert!(write_vars("vps-setup", &vars).is_err(), "a value containing a newline");
    }

    #[test]
    fn missing_vars_is_read_off_the_log() {
        let log = "some output\nMISSING_VARS:domain_name,smtp_email\nmore\n";
        assert_eq!(
            missing_vars(log),
            Some(vec!["domain_name".to_string(), "smtp_email".to_string()])
        );
        assert_eq!(missing_vars("nothing to see"), None);
        assert_eq!(missing_vars("MISSING_VARS:"), None);
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

    #[actix_web::test]
    async fn every_route_needs_an_admin_session() {
        let app = test::init_service(App::new().configure(routes::shell::router)).await;

        let paths = [
            "/api/shell/vps-setup/targets",
            "/api/shell/vps-setup/describe/ufw",
            "/api/shell/vps-setup/jobs/whatever",
            "/api/shell/vps-setup/jobs/whatever/logs",
        ];

        for path in paths {
            let res = test::call_service(&app, test::TestRequest::get().uri(path).to_request()).await;
            assert_eq!(res.status(), 401, "{} was reachable without a token", path);
        }

        let res = test::call_service(
            &app,
            test::TestRequest::post().uri("/api/shell/vps-setup/run/--full").to_request(),
        )
        .await;
        assert_eq!(res.status(), 401, "run was reachable without a token");

        // A signed-in non-admin is not enough either.
        let user = token(AccountRole::User);
        let res = test::call_service(
            &app,
            test::TestRequest::post()
                .uri("/api/shell/vps-setup/run/--full")
                .insert_header(("Authorization", format!("Bearer {}", user)))
                .to_request(),
        )
        .await;
        assert_eq!(res.status(), 403, "a non-admin could start a run");
    }

    #[actix_web::test]
    async fn bad_targets_are_rejected_before_bash_sees_them() {
        let admin = token(AccountRole::Administrator);
        let app = test::init_service(App::new().configure(routes::shell::router)).await;

        for target in ["..%2f..%2fetc", "--list", "Certbot", "a%20b"] {
            let res = test::call_service(
                &app,
                test::TestRequest::post()
                    .uri(&format!("/api/shell/vps-setup/run/{}", target))
                    .insert_header(("Authorization", format!("Bearer {}", admin)))
                    .to_request(),
            )
            .await;
            assert_eq!(res.status(), 400, "{} was not rejected", target);
        }
    }

    #[actix_web::test]
    async fn unknown_or_unsafe_bundles_are_refused() {
        let admin = token(AccountRole::Administrator);
        let app = test::init_service(App::new().configure(routes::shell::router)).await;

        // Malformed name -> 400, before any path is built.
        for name in ["..", "%2e%2e", "Bad", "-rf"] {
            let res = test::call_service(
                &app,
                test::TestRequest::get()
                    .uri(&format!("/api/shell/{}/targets", name))
                    .insert_header(("Authorization", format!("Bearer {}", admin)))
                    .to_request(),
            )
            .await;
            assert_eq!(res.status(), 400, "bundle {} was not rejected", name);
        }

        // Well-formed but not installed -> 404.
        let res = test::call_service(
            &app,
            test::TestRequest::get()
                .uri("/api/shell/not-installed/targets")
                .insert_header(("Authorization", format!("Bearer {}", admin)))
                .to_request(),
        )
        .await;
        assert_eq!(res.status(), 404);
    }

    #[actix_web::test]
    async fn unknown_jobs_are_404_not_a_panic() {
        let admin = token(AccountRole::Administrator);
        let app = test::init_service(App::new().configure(routes::shell::router)).await;

        for path in ["/api/shell/vps-setup/jobs/nope", "/api/shell/vps-setup/jobs/nope/logs"] {
            let res = test::call_service(
                &app,
                test::TestRequest::get()
                    .uri(path)
                    .insert_header(("Authorization", format!("Bearer {}", admin)))
                    .to_request(),
            )
            .await;
            assert_eq!(res.status(), 404, "{}", path);
        }
    }

}
