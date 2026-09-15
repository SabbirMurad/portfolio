use actix_web::{HttpResponse, Responder};

/// Last-modified dates, one per URL.
///
/// These were `Utc::now()` — every URL claimed to have changed today, on every
/// request. Google only trusts `lastmod` when it is consistently accurate and
/// discounts the whole file when it is not, so an always-today value was worse
/// than no value at all.
///
/// They are constants because the server has no reliable date to read at
/// runtime: a deploy rewrites file mtimes, so the filesystem would just be
/// "now" wearing a different hat. When a page's content changes, change its
/// date here. To read the real ones back out of git:
///
/// ```text
/// git log -1 --format=%cs -- pages/about.html assets/jsx/about.jsx
/// ```
const URLS: [(&str, &str, &str, &str); 5] = [
    // (path, lastmod, changefreq, priority)
    ("/", "2026-09-14", "weekly", "1.0"),
    ("/about", "2026-09-12", "weekly", "0.8"),
    ("/projects", "2026-08-20", "weekly", "0.8"),
    ("/documentations", "2026-08-24", "weekly", "0.8"),
    ("/resume", "2026-09-15", "monthly", "0.9"),
];

const SITE: &str = "https://sabbirhassan.com";

pub async fn handler() -> impl Responder {
    let mut xml = String::from(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n",
    );

    for (path, lastmod, changefreq, priority) in URLS {
        xml.push_str(&format!(
            "  <url>\n    \
               <loc>{site}{path}</loc>\n    \
               <lastmod>{lastmod}</lastmod>\n    \
               <changefreq>{changefreq}</changefreq>\n    \
               <priority>{priority}</priority>\n  \
             </url>\n",
            site = SITE,
            path = path,
            lastmod = lastmod,
            changefreq = changefreq,
            priority = priority,
        ));
    }

    xml.push_str("</urlset>");

    HttpResponse::Ok()
        .content_type("application/xml; charset=utf-8")
        .body(xml)
}
