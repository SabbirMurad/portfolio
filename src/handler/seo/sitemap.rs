use actix_web::{HttpResponse, Responder};
use chrono::Utc;

pub async fn handler() -> impl Responder {
    let today = Utc::now().format("%Y-%m-%d").to_string();

    let xml = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://sabbirhassan.com/</loc>
    <lastmod>{date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://sabbirhassan.com/contact</loc>
    <lastmod>{date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://sabbirhassan.com/hire</loc>
    <lastmod>{date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://sabbirhassan.com/admin/sign-in</loc>
    <lastmod>{date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>"#,
        date = today
    );

    HttpResponse::Ok()
        .content_type("application/xml; charset=utf-8")
        .body(xml)
}
