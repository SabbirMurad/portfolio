/*
 * Serves the two scripts a new machine fetches, both public and both
 * unauthenticated — they carry no secret, and gating the installer behind a
 * credential would be circular, since installing it is how you get one.
 *
 * `__API_BASE__` is replaced with the scheme and host the request arrived on,
 * so a client installed from anywhere talks back to where it came from and
 * nothing has to be hardcoded per environment.
 */
use std::fs;

use actix_web::{Error, HttpRequest, HttpResponse};

const INSTALL_SH: &str = "./assets/cli/install.sh";
const CLI_SH: &str = "./assets/cli/ct.sh";

pub async fn install(req: HttpRequest) -> Result<HttpResponse, Error> {
    Ok(serve(&req, INSTALL_SH))
}

pub async fn client(req: HttpRequest) -> Result<HttpResponse, Error> {
    Ok(serve(&req, CLI_SH))
}

fn serve(req: &HttpRequest, path: &str) -> HttpResponse {
    let body = match fs::read_to_string(path) {
        Ok(body) => body,
        Err(error) => {
            log::error!("{}: {:?}", path, error);
            return HttpResponse::NotFound().finish();
        }
    };

    HttpResponse::Ok()
        // text/plain rather than an executable type: this is piped to bash by
        // someone who asked for it, and a browser opening the URL should show
        // the source rather than offer a download.
        .content_type("text/plain; charset=utf-8")
        .body(body.replace("__API_BASE__", &base_url(req)))
}

/// The origin this request came in on. Behind the TLS terminator the scheme
/// actix sees can be http, so X-Forwarded-Proto wins when present — otherwise
/// an installer fetched over https would write an http base into the client.
fn base_url(req: &HttpRequest) -> String {
    let info = req.connection_info().clone();

    let scheme = req
        .headers()
        .get("x-forwarded-proto")
        .and_then(|v| v.to_str().ok())
        .map(|v| v.split(',').next().unwrap_or(v).trim().to_string())
        .unwrap_or_else(|| info.scheme().to_string());

    format!("{}://{}", scheme, info.host())
}
