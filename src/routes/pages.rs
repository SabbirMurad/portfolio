use actix_web::web;
use crate::Markup;
use crate::handler::seo::{ sitemap, robots };

pub fn router(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("")
        .route(
            "/",
            web::get().to(Markup::home)
        )
        .route(
            "/about",
            web::get().to(Markup::about)
        )
        .route(
            "/documentations",
            web::get().to(Markup::documentations)
        )
        .route(
            "/hire",
            web::get().to(Markup::hire)
        )
        .route(
            "/contact",
            web::get().to(Markup::contact)
        )
        .route(
            "/admin/sign-in",
            web::get().to(Markup::sign_in)
        )
        .route(
            "/sitemap.xml",
            web::get().to(sitemap::handler)
        )
        .route(
            "/robots.txt",
            web::get().to(robots::handler)
        )
    );
}