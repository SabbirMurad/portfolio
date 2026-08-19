/*
 * Unpacking a `mkdocs build` output zip so it serves from /documentation/{uuid}/
 * and behaves the way `mkdocs serve` does.
 *
 * MkDocs already emits *relative* links between pages and assets ("../ntp/",
 * "../assets/stylesheets/main.css"), so those need no rewriting at all — they
 * resolve correctly under any mount prefix, provided directory URLs keep their
 * trailing slash. Enforcing that is the serving side's job; see
 * handler/documentation/get.rs.
 *
 * Three things do need doing here:
 *
 *   1. `mkdocs build` output is normally zipped with its `site/` wrapper still
 *      on, which would put `assets/` one level below the mount point.
 *
 *   2. `site_url` in mkdocs.yml bakes an absolute base into <link rel=canonical>
 *      and sitemap.xml, and — because a 404 can be served from any depth —
 *      into every href/src in 404.html. Those all point at whatever the author's
 *      site_url said, so the base is swapped for /documentation/{uuid}/.
 *
 *   3. A project with no docs/index.md produces no index.html at the site root,
 *      so /documentation/{uuid}/ would 404 (it does under `mkdocs serve` too).
 *      One is generated, pointing at the first page in the nav.
 *
 *   4. The favicon is repointed at the site's own /assets/favicon set, so a doc
 *      site shows the same tab icon as the rest of sabbirhassan.com rather than
 *      whatever theme.favicon in its mkdocs.yml happened to name.
 */
use std::fs;
use std::io::{Cursor, Read, Write};
use std::path::{Component, Path, PathBuf};
use zip::ZipArchive;

/// A doc site is a few hundred files; well past that and something is wrong.
const MAX_ENTRIES: usize = 5_000;
/// Uncompressed ceiling — a zip bomb is a few KB on the wire.
const MAX_TOTAL_BYTES: u64 = 250 * 1024 * 1024;

/// Only text formats carry the baked-in `site_url`; rewriting minified JS/CSS
/// would risk mangling unrelated strings for no gain.
const REWRITABLE: [&str; 2] = ["html", "xml"];

/// Mirrors the icon links in pages/common/favicon.html — a doc site is served
/// from the same origin, so these root-absolute paths resolve. Kept to the three
/// icon links; the apple-touch-icon and webmanifest belong to the site proper,
/// not to a documentation sub-tree.
const FAVICON_LINKS: &str = concat!(
    "<link rel=\"icon\" type=\"image/svg+xml\" href=\"/assets/favicon/favicon.svg\">",
    "<link rel=\"icon\" type=\"image/png\" sizes=\"96x96\" href=\"/assets/favicon/favicon-96x96.png\">",
    "<link rel=\"shortcut icon\" href=\"/assets/favicon/favicon.ico\">",
);

/// Unpack `zip_bytes` into `target_dir` (which must not already exist) and make
/// the result servable at `/documentation/{uuid}/`.
pub fn unpack(zip_bytes: &[u8], target_dir: &Path, uuid: &str) -> Result<(), String> {
    let mut archive = ZipArchive::new(Cursor::new(zip_bytes))
        .map_err(|e| format!("Not a readable zip file: {}", e))?;

    if archive.len() > MAX_ENTRIES {
        return Err(format!("Archive has too many files (max {})", MAX_ENTRIES));
    }

    let strip = common_root(&archive);

    fs::create_dir_all(target_dir).map_err(|e| e.to_string())?;

    let mut total: u64 = 0;
    let mut wrote_any = false;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;

        // `enclosed_name` is None for anything that would escape the target
        // (absolute paths, `..` components) — those entries are dropped rather
        // than sanitised, so a malicious archive can't write outside its dir.
        let name = match entry.enclosed_name() {
            Some(p) => p.to_path_buf(),
            None => continue,
        };

        let rel = match &strip {
            Some(root) => match name.strip_prefix(root) {
                Ok(r) => r.to_path_buf(),
                Err(_) => continue,
            },
            None => name,
        };
        if rel.as_os_str().is_empty() {
            continue;
        }

        let out_path = target_dir.join(&rel);

        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
            continue;
        }

        total += entry.size();
        if total > MAX_TOTAL_BYTES {
            return Err("Archive is too large once unpacked".to_string());
        }

        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let mut buf = Vec::with_capacity(entry.size() as usize);
        entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
        fs::write(&out_path, &buf).map_err(|e| e.to_string())?;
        wrote_any = true;
    }

    if !wrote_any {
        return Err("Archive contained no files".to_string());
    }

    let files = walk(target_dir)?;
    rebase(target_dir, &files, uuid)?;
    retarget_favicon(&files)?;
    ensure_index(target_dir, &files)?;

    Ok(())
}

/// The single directory every entry sits under, if there is one — `mkdocs build`
/// output zipped whole gives "site". Returns None when entries already sit at
/// the archive root, so a zip made from *inside* `site/` works too.
fn common_root(archive: &ZipArchive<Cursor<&[u8]>>) -> Option<PathBuf> {
    let mut root: Option<String> = None;

    for name in archive.file_names() {
        let first = name.split('/').next().unwrap_or("");
        if first.is_empty() {
            return None;
        }
        // An entry with no separator after the first segment is a file at the
        // archive root, so there is no common directory to strip.
        if !name[first.len()..].starts_with('/') {
            return None;
        }
        match &root {
            None => root = Some(first.to_string()),
            Some(r) if r == first => {}
            Some(_) => return None,
        }
    }

    root.map(PathBuf::from)
}

fn walk(dir: &Path) -> Result<Vec<PathBuf>, String> {
    let mut out = Vec::new();
    let mut stack = vec![dir.to_path_buf()];

    while let Some(current) = stack.pop() {
        let entries = fs::read_dir(&current).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else {
                out.push(path);
            }
        }
    }

    out.sort();
    Ok(out)
}

/// Swap the `site_url` base baked into the build for this site's real mount.
///
/// The base is read back off a page's own <link rel="canonical">: that URL is
/// `{site_url}{page dir}/`, so stripping the page's directory leaves the base.
/// Replacing the *path* portion covers both the absolute URLs (canonical,
/// sitemap) and the root-absolute href/src in 404.html in one pass.
fn rebase(root: &Path, files: &[PathBuf], uuid: &str) -> Result<(), String> {
    let new_path = format!("/documentation/{}/", uuid);

    let (origin, old_path) = match find_base(root, files) {
        Some(b) => b,
        // No site_url in mkdocs.yml — nothing absolute was emitted except in
        // 404.html, handled below.
        None => return rebase_404_only(root, &new_path),
    };

    let old_abs = format!("{}{}", origin, old_path);
    let new_abs = format!("{}{}", origin, new_path);

    for path in files {
        if !has_ext(path, &REWRITABLE) {
            continue;
        }
        let text = match fs::read_to_string(path) {
            Ok(t) => t,
            Err(_) => continue, // not valid UTF-8; nothing to rewrite in it
        };

        // Absolute form first — it contains the path form, so doing it second
        // would leave a half-rewritten URL behind.
        let mut next = text.replace(&old_abs, &new_abs);
        // A site_url with no sub-path leaves old_path == "/", which is far too
        // broad to string-replace; the absolute pass above already covered it.
        if old_path != "/" {
            next = next.replace(&old_path, &new_path);
        }

        if next != text {
            fs::write(path, next).map_err(|e| e.to_string())?;
        }
    }

    regzip_sitemap(root)?;
    Ok(())
}

/// Returns ("https://host", "/base/path/") from the first canonical link found.
fn find_base(root: &Path, files: &[PathBuf]) -> Option<(String, String)> {
    for path in files {
        if !has_ext(path, &["html"]) || is_404(root, path) {
            continue;
        }
        let text = fs::read_to_string(path).ok()?;
        let canonical = match extract_canonical(&text) {
            Some(c) => c,
            None => continue,
        };

        // Split "https://host" from "/path/".
        let scheme_end = canonical.find("://")? + 3;
        let path_start = canonical[scheme_end..].find('/')? + scheme_end;
        let origin = canonical[..path_start].to_string();
        let mut base = canonical[path_start..].to_string();

        // The canonical is the base plus this page's own directory; drop it.
        let suffix = page_suffix(root, path);
        if !suffix.is_empty() && base.ends_with(&suffix) {
            base.truncate(base.len() - suffix.len());
        }
        if base.is_empty() {
            base.push('/');
        }

        return Some((origin, base));
    }
    None
}

fn extract_canonical(html: &str) -> Option<String> {
    let idx = html.find("rel=\"canonical\"")?;
    let rest = &html[idx..];
    let href = rest.find("href=\"")? + 6;
    let end = rest[href..].find('"')? + href;
    Some(rest[href..end].to_string())
}

/// "getting_started/index.html" -> "getting_started/", "index.html" -> "".
fn page_suffix(root: &Path, path: &Path) -> String {
    let rel = match path.strip_prefix(root) {
        Ok(r) => r,
        Err(_) => return String::new(),
    };
    match rel.parent() {
        Some(p) if !p.as_os_str().is_empty() => format!("{}/", to_slash(p)),
        _ => String::new(),
    }
}

/// Without a site_url, 404.html is still emitted with root-absolute links
/// (it can be served from any depth, so it can't use relative ones). Prefix
/// them with the mount point; anything already absolute-with-scheme is left be.
fn rebase_404_only(root: &Path, new_path: &str) -> Result<(), String> {
    let path = root.join("404.html");
    let text = match fs::read_to_string(&path) {
        Ok(t) => t,
        Err(_) => return Ok(()),
    };

    let next = text
        .replace("href=\"/", &format!("href=\"{}", new_path))
        .replace("src=\"/", &format!("src=\"{}", new_path));

    if next != text {
        fs::write(&path, next).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// sitemap.xml.gz is a copy of sitemap.xml, so it still holds the pre-rewrite
/// URLs after the pass above. Regenerate it from the rewritten source.
fn regzip_sitemap(root: &Path) -> Result<(), String> {
    let xml = root.join("sitemap.xml");
    let gz = root.join("sitemap.xml.gz");
    if !xml.is_file() || !gz.is_file() {
        return Ok(());
    }

    let bytes = fs::read(&xml).map_err(|e| e.to_string())?;
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    encoder.write_all(&bytes).map_err(|e| e.to_string())?;
    let packed = encoder.finish().map_err(|e| e.to_string())?;
    fs::write(&gz, packed).map_err(|e| e.to_string())?;
    Ok(())
}

/// Drop whatever icon links the theme emitted and use the site's own favicon.
///
/// Run after `rebase` so there is only one shape of icon link left to find —
/// and it doesn't matter what it pointed at, since the whole tag is replaced.
fn retarget_favicon(files: &[PathBuf]) -> Result<(), String> {
    let pattern = regex::Regex::new(r#"(?i)<link[^>]*\srel="(?:shortcut )?icon"[^>]*>"#)
        .map_err(|e| e.to_string())?;

    for path in files {
        if !has_ext(path, &["html"]) {
            continue;
        }
        let text = match fs::read_to_string(path) {
            Ok(t) => t,
            Err(_) => continue,
        };

        // Strip every existing icon link, then put the set back in one place
        // rather than trying to patch each tag in situ.
        let stripped = pattern.replace_all(&text, "").into_owned();
        let next = match stripped.find("</head>") {
            Some(i) => format!("{}{}{}", &stripped[..i], FAVICON_LINKS, &stripped[i..]),
            // No </head> to anchor to — leaving the page without an icon link
            // beats injecting markup at a guessed position.
            None => stripped,
        };

        if next != text {
            fs::write(path, next).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// Give the site root an index.html when the build has none, so
/// /documentation/{uuid}/ lands somewhere instead of 404ing.
fn ensure_index(root: &Path, files: &[PathBuf]) -> Result<(), String> {
    let index = root.join("index.html");
    if index.is_file() {
        return Ok(());
    }

    let entry = match first_nav_page(root, files).or_else(|| first_page(root, files)) {
        Some(e) => e,
        None => return Ok(()), // no HTML at all; nothing sensible to point at
    };

    let html = format!(
        "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n\
         <title>Documentation</title>\n{favicon}\n<link rel=\"canonical\" href=\"{entry}\">\n\
         <meta http-equiv=\"refresh\" content=\"0; url={entry}\">\n</head>\n<body>\n\
         <p>Redirecting to <a href=\"{entry}\">{entry}</a>…</p>\n\
         <script>location.replace(\"{entry}\");</script>\n</body>\n</html>\n",
        // This page is written after retarget_favicon has run, so it has to
        // carry the icon links itself or the tab flashes a default one.
        favicon = FAVICON_LINKS,
        entry = entry
    );

    fs::write(&index, html).map_err(|e| e.to_string())?;
    Ok(())
}

/// The first entry in the rendered nav, resolved against the page it was read
/// from. Nav order is the author's intent; it is not recoverable from
/// sitemap.xml or search_index.json, both of which are alphabetical.
fn first_nav_page(root: &Path, files: &[PathBuf]) -> Option<String> {
    for path in files {
        if !has_ext(path, &["html"]) || is_404(root, path) {
            continue;
        }
        let text = fs::read_to_string(path).ok()?;
        let idx = match text.find("md-nav__link") {
            Some(i) => i,
            None => continue,
        };
        // Walk back to the opening tag this class belongs to, then read its href.
        let tag = text[..idx].rfind("<a ")?;
        let href_start = text[tag..idx].find("href=\"")? + tag + 6;
        let href_end = text[href_start..].find('"')? + href_start;
        let href = &text[href_start..href_end];

        if href.starts_with("http") || href.starts_with('/') {
            continue; // absolute — not something to resolve against this page
        }
        return Some(normalize_join(&page_suffix(root, path), href));
    }
    None
}

/// Fallback when the nav can't be read: the shallowest, alphabetically first
/// page. Alphabetical is arbitrary, but it beats a 404.
fn first_page(root: &Path, files: &[PathBuf]) -> Option<String> {
    let mut best: Option<(usize, String)> = None;
    for path in files {
        if !has_ext(path, &["html"]) || is_404(root, path) {
            continue;
        }
        let rel = path.strip_prefix(root).ok()?;
        let depth = rel.components().count();
        let url = if rel.file_name()?.to_string_lossy() == "index.html" {
            page_suffix(root, path)
        } else {
            to_slash(rel)
        };
        if best.as_ref().map_or(true, |(d, _)| depth < *d) {
            best = Some((depth, url));
        }
    }
    best.map(|(_, u)| u)
}

/// Resolve `href` against directory `base` ("getting_started/" + "../ntp/").
fn normalize_join(base: &str, href: &str) -> String {
    let mut parts: Vec<&str> = base.split('/').filter(|s| !s.is_empty()).collect();
    let trailing = href.ends_with('/') || href.ends_with('.');

    for seg in href.split('/') {
        match seg {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            s => parts.push(s),
        }
    }

    let mut out = parts.join("/");
    if trailing && !out.is_empty() && !out.ends_with('/') {
        out.push('/');
    }
    out
}

fn is_404(root: &Path, path: &Path) -> bool {
    path.strip_prefix(root)
        .map(|r| r == Path::new("404.html"))
        .unwrap_or(false)
}

fn has_ext(path: &Path, exts: &[&str]) -> bool {
    match path.extension().and_then(|e| e.to_str()) {
        Some(e) => exts.iter().any(|w| w.eq_ignore_ascii_case(e)),
        None => false,
    }
}

fn to_slash(path: &Path) -> String {
    path.components()
        .filter_map(|c| match c {
            Component::Normal(s) => Some(s.to_string_lossy().to_string()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("/")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn join_resolves_dot_and_parent() {
        assert_eq!(normalize_join("getting_started/", "./"), "getting_started/");
        assert_eq!(normalize_join("getting_started/", "../ntp/"), "ntp/");
        assert_eq!(normalize_join("", "getting_started/"), "getting_started/");
        assert_eq!(normalize_join("a/b/", "../../c/"), "c/");
    }

    #[test]
    fn page_suffix_drops_the_filename() {
        let root = Path::new("/site");
        assert_eq!(page_suffix(root, Path::new("/site/index.html")), "");
        assert_eq!(
            page_suffix(root, Path::new("/site/getting_started/index.html")),
            "getting_started/"
        );
    }

    #[test]
    fn canonical_is_read_off_the_link_tag() {
        let html = r#"<link rel="canonical" href="https://x.dev/docs/a/" /><link href="z">"#;
        assert_eq!(
            extract_canonical(html).as_deref(),
            Some("https://x.dev/docs/a/")
        );
        assert_eq!(extract_canonical("<p>nothing</p>"), None);
    }

    /// End-to-end against a real `mkdocs build` zip. Skipped when the fixture
    /// isn't present so the suite still runs on a clean checkout.
    #[test]
    fn unpacks_a_real_mkdocs_build() {
        let fixture = Path::new("site.zip");
        if !fixture.is_file() {
            eprintln!("skipping: site.zip fixture not present");
            return;
        }

        let bytes = fs::read(fixture).unwrap();
        let uuid = "0198f2b1-test-7000-8000-000000000000";
        let out = std::env::temp_dir().join(format!("mkdocs-unpack-{}", uuid));
        let _ = fs::remove_dir_all(&out);

        unpack(&bytes, &out, uuid).expect("unpack should succeed");

        // 1. the `site/` wrapper is gone — assets sit at the root
        assert!(out.join("assets/stylesheets").is_dir(), "assets/ not at root");
        assert!(!out.join("site").exists(), "site/ wrapper was not stripped");

        // 2. a root index.html was generated, pointing at the first nav page
        let index = fs::read_to_string(out.join("index.html")).unwrap();
        assert!(
            index.contains("url=getting_started/"),
            "generated index should point at the first nav page, got:\n{}",
            index
        );

        // 3. the baked-in site_url base was swapped for this mount
        let page = fs::read_to_string(out.join("getting_started/index.html")).unwrap();
        assert!(
            page.contains(&format!("https://sabbirhassan.com/documentation/{}/getting_started/", uuid)),
            "canonical was not rebased"
        );
        assert!(!page.contains("/documentations/vps-config/"), "old base survived");

        // 4. 404.html's root-absolute links were rebased too
        let notfound = fs::read_to_string(out.join("404.html")).unwrap();
        assert!(
            notfound.contains(&format!("/documentation/{}/assets/stylesheets/", uuid)),
            "404.html assets were not rebased"
        );
        assert!(!notfound.contains("/documentations/vps-config/"), "old base survived in 404");

        // 5. sitemap.xml rewritten, and the .gz regenerated to match
        let sitemap = fs::read_to_string(out.join("sitemap.xml")).unwrap();
        assert!(!sitemap.contains("/documentations/vps-config/"), "sitemap not rebased");
        let gz = fs::read(out.join("sitemap.xml.gz")).unwrap();
        assert!(gz.starts_with(&[0x1f, 0x8b]), "sitemap.xml.gz is not gzip");

        // 6. relative links between pages are left exactly as mkdocs wrote them
        assert!(page.contains(r#"href="../ntp/""#), "relative links were touched");

        // 7. the favicon comes from the site's own set, not the theme's —
        //    including on the index.html generated after that pass runs
        for name in ["getting_started/index.html", "404.html", "index.html"] {
            let html = fs::read_to_string(out.join(name)).unwrap();
            assert!(
                html.contains(r#"href="/assets/favicon/favicon.svg""#),
                "{} did not get the site favicon",
                name
            );
            assert!(
                !html.contains(r#"rel="icon" href="#),
                "{} still carries the theme's icon link",
                name
            );
            assert_eq!(html.matches("rel=\"icon\"").count(), 2, "{}: expected exactly the svg+png icon links", name);
        }

        // 8. binary assets survived the round trip
        let favicon = fs::read(out.join("assets/images/favicon.png")).unwrap();
        assert!(favicon.starts_with(&[0x89, b'P', b'N', b'G']), "png corrupted");

        fs::remove_dir_all(&out).ok();
    }
}

/// Unpacks site.zip into ./documentation/preview and leaves it there, for
/// eyeballing the result in a browser. Not part of the normal suite:
/// `cargo test unpack_fixture_for_inspection -- --ignored`
#[cfg(test)]
#[test]
#[ignore]
fn unpack_fixture_for_inspection() {
    let bytes = fs::read("site.zip").expect("site.zip fixture required");
    let out = PathBuf::from("./documentation/preview");
    let _ = fs::remove_dir_all(&out);
    unpack(&bytes, &out, "preview").unwrap();
    println!("unpacked to {}", out.display());
}
