use std::env;
use actix_cors::Cors;

/*
  Cross-Origin Resource Sharing (CORS)
  An HTTP-header based mechanism that allows a server to indicate any origins (domain, scheme, or port) other than its own from which a browser should permit loading resources.

  Visit: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

  In Plain English:
  Let's say, this server is for `foo.com`
  The following `allowed_origin()` indicate that only
  The listed FQDN are allowed to make `JavaScript API` calls
  Such as `XHR` or `fetch()` request to the `foo.com`
  Otherwise, leave it as it is
*/

pub fn get_policy() -> Cors {
    let mode = env::var("APP_STAGE")
        .expect("APP_STAGE must be set on .env file");

    if mode == "development" { Cors::permissive() }
    else {
        // Replace the Origin names with targeted FQDN
        // You can also add more constraints if needed
        Cors::default()
            // .allowed_origin("https://example.com")
            .allowed_origin("https://bitlaab.com:446")
            .allow_any_header()
            .allow_any_method()
            .max_age(3600)
    }
}
