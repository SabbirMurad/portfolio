use actix_web::HttpResponse;
use serde::{ Serialize, Deserialize };

#[derive(Serialize, Deserialize)]
pub struct Response {
  pub message: String
}

impl Response {
  pub fn bad_request(message: &str) -> HttpResponse {
    HttpResponse::BadRequest().content_type("application/json").json(
      Response { message: message.to_string() }
    )
  }

  pub fn unauthorized(message: &str) -> HttpResponse {
    HttpResponse::Unauthorized().content_type("application/json").json(
      Response { message: message.to_string() }
    )
  }

  pub fn _payment_required(message: &str) -> HttpResponse {
    HttpResponse::PaymentRequired().content_type("application/json").json(
      Response { message: message.to_string() }
    )
  }

  pub fn forbidden(message: &str) -> HttpResponse {
    HttpResponse::Forbidden().content_type("application/json").json(
      Response { message: message.to_string() }
    )
  }

  pub fn not_found(message: &str) -> HttpResponse {
    HttpResponse::NotFound().content_type("application/json").json(
      Response { message: message.to_string() }
    )
  }

  pub fn _gone(message: &str) -> HttpResponse {
    HttpResponse::Gone().content_type("application/json").json(
      Response { message: message.to_string() }
    )
  }

  pub fn internal_server_error(message: &str) -> HttpResponse {
    HttpResponse::InternalServerError().content_type("application/json").json(
      Response {message: message.to_string() }
    )
  }
}