use actix_web::web;
use crate::Handler;

pub fn router(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/leetcode")
            .route("/stats", web::get().to(Handler::Leetcode::Stats::task))
    );
}
