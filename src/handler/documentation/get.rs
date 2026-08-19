/*
 * Serves an unpacked mkdocs site out of DOCS_ROOT/{uuid}.
 *
 * The one rule everything else follows from: MkDocs links between pages
 * relatively ("../ntp/", "../assets/stylesheets/main.css"), so a directory URL
 * has to keep its trailing slash. `/documentation/{id}/getting_started` and
 * `/documentation/{id}/getting_started/` are *not* interchangeable — from the
 * first, "../assets/x.css" resolves to /documentation/assets/x.css and every
 * stylesheet 404s. So a directory request without the slash gets a 301 to the
 * slash form rather than being quietly served, which is what `mkdocs serve`
 * (and any static host worth using) does.
 */
use crate::DOCS_ROOT;
use std::path::{Component, Path, PathBuf};
use std::fs;
use actix_web::{http::header, web, Error, HttpResponse};

/// Redirect for `/documentation/{id}` -> `/documentation/{id}/`. Without the
/// slash, every relative link on the page it serves resolves one level too high.
pub async fn root_redirect(var: web::Path<String>) -> Result<HttpResponse, Error> {
    Ok(redirect(&format!("/documentation/{}/", var.into_inner())))
}

pub async fn task(var: web::Path<(String, String)>) -> Result<HttpResponse, Error> {
    let (project, tail) = var.into_inner();

    let site_root = Path::new(DOCS_ROOT).join(&project);
    // canonicalize resolves symlinks and `..` for real; comparing the result
    // against the site root is what actually contains the request, rather than
    // trusting the string that came in off the wire.
    let site_root = match site_root.canonicalize() {
        Ok(p) => p,
        Err(_) => return Ok(HttpResponse::NotFound().finish()),
    };

    let relative = match safe_relative(&tail) {
        Some(r) => r,
        None => return Ok(HttpResponse::NotFound().finish()),
    };

    let target = site_root.join(&relative);
    let target = match target.canonicalize() {
        Ok(p) => p,
        Err(_) => return Ok(HttpResponse::NotFound().finish()),
    };
    if !target.starts_with(&site_root) {
        return Ok(HttpResponse::NotFound().finish());
    }

    if target.is_dir() {
        // "" (the site root) always ends in a slash — the route only matches
        // /documentation/{id}/... — so only deeper directories can need this.
        if !tail.is_empty() && !tail.ends_with('/') {
            return Ok(redirect(&format!("/documentation/{}/{}/", project, tail)));
        }

        let index = target.join("index.html");
        if !index.is_file() {
            return Ok(HttpResponse::NotFound().finish());
        }
        return serve(&index);
    }

    serve(&target)
}

fn serve(path: &Path) -> Result<HttpResponse, Error> {
    // read, not read_to_string: fonts, images and the search index are not
    // UTF-8, and a doc site is mostly those by byte count.
    let bytes = match fs::read(path) {
        Ok(b) => b,
        Err(_) => return Ok(HttpResponse::NotFound().finish()),
    };

    Ok(HttpResponse::Ok()
        .content_type(content_type(path))
        .body(bytes))
}

fn redirect(location: &str) -> HttpResponse {
    HttpResponse::MovedPermanently()
        .append_header((header::LOCATION, location))
        .finish()
}

/// Rejects anything that would climb out of the site: absolute paths, drive
/// prefixes, and `..` components. Returning None rather than stripping them
/// keeps a crafted URL from silently resolving somewhere unintended.
fn safe_relative(tail: &str) -> Option<PathBuf> {
    if tail.is_empty() {
        return Some(PathBuf::new());
    }

    let path = Path::new(tail);
    let mut out = PathBuf::new();

    for component in path.components() {
        match component {
            Component::Normal(part) => out.push(part),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => return None,
        }
    }

    Some(out)
}

fn content_type(path: &Path) -> &'static str {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    match ext.as_str() {
        "html" | "htm" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "json" | "map" => "application/json; charset=utf-8",
        "xml" => "application/xml; charset=utf-8",
        "txt" => "text/plain; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "ico" => "image/x-icon",
        // MkDocs Material ships woff2; the previous list spelled these "woof".
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "eot" => "application/vnd.ms-fontobject",
        "gz" => "application/gzip",
        "pdf" => "application/pdf",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::routes;
    use crate::utils::mkdocs;
    use actix_web::{test, App};

    const UUID: &str = "0198f2b1-serve-7000-8000-000000000000";

    /// Unpacks the real fixture into DOCS_ROOT so the handler reads the same
    /// tree it would in production. Returns None when the fixture is absent.
    fn fixture() -> Option<PathBuf> {
        let zip = Path::new("site.zip");
        if !zip.is_file() {
            eprintln!("skipping: site.zip fixture not present");
            return None;
        }
        let dir = Path::new(DOCS_ROOT).join(UUID);
        let _ = fs::remove_dir_all(&dir);
        let bytes = fs::read(zip).unwrap();
        mkdocs::unpack(&bytes, &dir, UUID).unwrap();
        Some(dir)
    }

    #[actix_web::test]
    async fn serves_a_doc_site_the_way_mkdocs_serve_does() {
        let dir = match fixture() {
            Some(d) => d,
            None => return,
        };

        let app = test::init_service(
            App::new().configure(routes::documentation::router)
        ).await;

        // A macro rather than a closure: an async closure would have to move
        // `app` in on its first call.
        macro_rules! get {
            ($($arg:tt)*) => {
                test::call_service(
                    &app,
                    test::TestRequest::get().uri(&format!($($arg)*)).to_request(),
                ).await
            };
        }

        // Bare id redirects to the slash form — relative links depend on it.
        let res = get!("/documentation/{}", UUID);
        assert_eq!(res.status(), 301);
        assert_eq!(
            res.headers().get("location").unwrap(),
            &format!("/documentation/{}/", UUID)[..]
        );

        // Site root serves the generated index.
        let res = get!("/documentation/{}/", UUID);
        assert_eq!(res.status(), 200);
        assert_eq!(res.headers().get("content-type").unwrap(), "text/html; charset=utf-8");

        // A page directory without its slash redirects rather than being served
        // — served directly, its "../assets/..." links would resolve one level
        // too high and every stylesheet would 404.
        let res = get!("/documentation/{}/getting_started", UUID);
        assert_eq!(res.status(), 301);
        assert_eq!(
            res.headers().get("location").unwrap(),
            &format!("/documentation/{}/getting_started/", UUID)[..]
        );

        // With the slash, the directory's index.html.
        let res = get!("/documentation/{}/getting_started/", UUID);
        assert_eq!(res.status(), 200);
        let body = test::read_body(res).await;
        assert!(String::from_utf8_lossy(&body).contains("Getting Started"));

        // Stylesheet, at the path the page's relative link resolves to.
        let css = fs::read_dir(dir.join("assets/stylesheets"))
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().to_string())
            .find(|n| n.starts_with("main.") && n.ends_with(".css"))
            .unwrap();
        let res = get!("/documentation/{}/assets/stylesheets/{}", UUID, css);
        assert_eq!(res.status(), 200);
        assert_eq!(res.headers().get("content-type").unwrap(), "text/css; charset=utf-8");

        // Binary asset — the previous read_to_string version 404'd on these.
        let res = get!("/documentation/{}/assets/images/favicon.png", UUID);
        assert_eq!(res.status(), 200);
        assert_eq!(res.headers().get("content-type").unwrap(), "image/png");
        let body = test::read_body(res).await;
        assert!(body.starts_with(&[0x89, b'P', b'N', b'G']), "png body corrupted");

        // Search worker + index, both needed for the search box to work.
        let res = get!("/documentation/{}/search/search_index.json", UUID);
        assert_eq!(res.status(), 200);
        assert_eq!(res.headers().get("content-type").unwrap(), "application/json; charset=utf-8");

        // Nothing escapes the site root.
        let res = get!("/documentation/{}/../../Cargo.toml", UUID);
        assert_eq!(res.status(), 404, "traversal must not resolve");
        let res = get!("/documentation/{}/nope.html", UUID);
        assert_eq!(res.status(), 404);

        fs::remove_dir_all(&dir).ok();
    }
}
