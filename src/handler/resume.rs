use actix_web::{ Error, HttpResponse };

pub async fn task() -> Result<HttpResponse, Error> {
    let pdf = tokio::fs::read("assets/cv.pdf").await
        .map_err(|_| actix_web::error::ErrorNotFound("cv.pdf not found"))?;

    Ok(HttpResponse::Ok()
        .content_type("application/pdf")
        .body(pdf))
}
