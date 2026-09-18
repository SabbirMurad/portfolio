use actix_web::{HttpResponse, Responder};

/// Last-modified dates and images, one row per URL.
///
/// The dates were `Utc::now()` — every URL claimed to have changed today, on
/// every request. Google only trusts `lastmod` when it is consistently
/// accurate and discounts the whole file when it is not, so an always-today
/// value was worse than no value at all.
///
/// They are constants because the server has no reliable date to read at
/// runtime: a deploy rewrites file mtimes, so the filesystem would just be
/// "now" wearing a different hat. When a page's content changes, change its
/// date here. To read the real ones back out of git:
///
/// ```text
/// git log -1 --format=%cs -- pages/about.html assets/jsx/about.jsx
/// ```
///
/// The last column is images to declare for that page, via the sitemap image
/// extension. Google discovers images from `<img>` elements, and every image
/// on this site is injected by JavaScript after the page loads — this is the
/// supported way to name one without waiting for a render that may never
/// finish. `og:image` does not do this job; that tag is for social cards.
/// Only `<image:loc>` is read — caption, title and licence were dropped from
/// the spec years ago.
const URLS: [(&str, &str, &str, &str, &[&str]); 5] = [
    // (path, lastmod, changefreq, priority, images)
    (
        "/",
        "2026-09-18",
        "weekly",
        "1.0",
        // The portrait in the About section, the same file the head points at.
        &["/assets/image/sabbir_hassan.webp"],
    ),
    (
        "/about",
        "2026-09-12",
        "weekly",
        "0.8",
        &["/assets/image/sabbir_hassan.webp"],
    ),
    ("/projects", "2026-08-20", "weekly", "0.8", &[]),
    ("/documentations", "2026-08-24", "weekly", "0.8", &[]),
    ("/resume", "2026-09-15", "monthly", "0.9", &[]),
];

const SITE: &str = "https://sabbirhassan.com";

pub async fn handler() -> impl Responder {
    let has_images = URLS.iter().any(|(_, _, _, _, images)| !images.is_empty());

    let mut xml = String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    xml.push_str("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"");
    if has_images {
        xml.push_str("\n        xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\"");
    }
    xml.push_str(">\n");

    for (path, lastmod, changefreq, priority, images) in URLS {
        xml.push_str(&format!(
            "  <url>\n    \
               <loc>{site}{path}</loc>\n    \
               <lastmod>{lastmod}</lastmod>\n    \
               <changefreq>{changefreq}</changefreq>\n    \
               <priority>{priority}</priority>\n",
            site = SITE,
            path = path,
            lastmod = lastmod,
            changefreq = changefreq,
            priority = priority,
        ));

        for image in images {
            xml.push_str(&format!(
                "    <image:image>\n      \
                   <image:loc>{site}{image}</image:loc>\n    \
                 </image:image>\n",
                site = SITE,
                image = image,
            ));
        }

        xml.push_str("  </url>\n");
    }

    xml.push_str("</urlset>");

    HttpResponse::Ok()
        .content_type("application/xml; charset=utf-8")
        .body(xml)
}
