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
            "/projects",
            web::get().to(Markup::projects)
        )
        // Detail pages hang off the same segment as the grid that links to
        // them. Declared after "/projects" so the literal keeps its route.
        .route(
            "/projects/{slug}",
            web::get().to(Markup::project_detail)
        )
        .route(
            "/resume",
            web::get().to(Markup::resume)
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
            "/admin/sign-up",
            web::get().to(Markup::sign_up)
        )
        .route(
            "/admin/dashboard",
            web::get().to(Markup::dashboard)
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