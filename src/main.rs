use std::{ env, io };
use listenfd::ListenFd;
use tera::{ Tera, Context };
use dotenv::dotenv as App_env;
use actix_files as StaticResource;
use futures_util::future::{self, Either, FutureExt};
use actix_session::{ SessionMiddleware, storage::RedisActorSessionStore };
use actix_session::config::{ PersistentSession, TtlExtensionPolicy, CookieContentSecurity };
use actix_web::{ web, dev, http, error, middleware as ActixMiddleware, App, dev::Service, cookie::SameSite, cookie::Key, cookie::time::Duration, HttpResponse, HttpServer };

mod builtins;
use builtins as BuiltIns;

mod schema;
use schema as Schema;

mod middleware;
use middleware as Middleware;

mod utils;
use utils as Utils;

mod routes;
use routes as Routes;

mod integrations;
use integrations as Integrations;

mod handler;
use handler as Handler;

mod markup;
use markup as Markup;

#[actix_web::main]
async fn main() -> io::Result<()> {
    /*
    Loads environment variables from `.env` file to `std::env`
    */ 
    App_env().ok();

    /*
    Use with log::info!() | log::warn!() | log::error!()
    */
    let _logger = BuiltIns::logger::init();

    /*
    RUNS CORN JOB FOR YOUR PROJECT
    Remove the following code block if you are not using this feature.
    */
    /*  tokio::spawn(async move {
            use tokio::time::{self, Duration};
            let mut interval = time::interval(Duration::from_secs(60));   
            loop {
            interval.tick().await;

                /*
                Execute your desired CORN routines here.
                */ 
                BuiltIn::cron::greet().await;
            }
        });
    */

    /*
        Sqlite Database Initialization
        Remove the following code block if you are not using this feature.
    */ 
    log::info!("\nExecuting Sqlite3 Prerequisites...");
    BuiltIns::sqlite::create_initial_tables().expect("Failed to initiate!\n");

    let mut listenfd = ListenFd::from_env();

    let host = env::var("APP_HOST")
        .expect("APP_HOST must be set on .env file");
    let http_port = env::var("APP_HTTP_PORT")
        .expect("APP_HTTP_PORT must be set on .env file");
    let https_port = env::var("APP_HTTPS_PORT")
        .expect("APP_HTTPS_PORT must be set on .env file");

    let redis_host = env::var("REDIS_HOST")
        .expect("REDIS_HOST must be set on .env file");
    let redis_port = env::var("REDIS_PORT")
        .expect("REDIS_PORT must be set on .env file");
    let redis_server = format!("{}:{}",redis_host,redis_port);
  
    /*
        Use a unique private key for every project.
        Anyone with access to the key can generate authentication cookies
        For any user on the system, which will compromise the authentication system!
    */
    let private_key = env::var("SESSION_KEY")
        .expect("SESSION_KEY must be set on .env file");

    let http_server = HttpServer::new(move || {
        /*
        IMPORTANT:
        Do not create any global data such as web::Data<T> here
        Multi CPU machine can spawn multiple thread and will create multiple global instance of such data.
        */

        App::new()
        .wrap_fn(|sreq, srv| {
            let app_http = env::var("APP_HTTP")
            .expect("APP_HTTP must be set on .env file");
                
            /* Redirects request from HTTP to HTTPS */
            if app_http.to_owned() == "allow" || sreq.connection_info().scheme() == "https" {
                Either::Left(srv.call(sreq).map(|res| res))
            } else {
                let host = sreq.connection_info().host().to_owned();
                let host: Vec<&str> = host.split(":").collect();
                let uri = sreq.uri().to_owned();
                let url = format!("https://{}:{}{}", host[0], env::var("APP_HTTPS_PORT").unwrap(), uri);
            
                return Either::Right(
                    future::ready(
                        Ok(sreq.into_response(
                            HttpResponse::MovedPermanently()
                            .append_header((http::header::LOCATION, url))
                            .finish()
                        ))
                    )
                );
            }
        })
        .wrap_fn(move |req, srv| {
            /* 301 - Moved Permanently | URL Canonicalization */ 
            srv.call(req).map(|res| {
              let app_http = env::var("APP_HTTP")
              .expect("APP_HTTP must be set on .env file");
              if app_http.to_owned() == "allow" { return res }
            
              if let Ok(response) = &res {
                let request = response.request();

                let uri = request.uri().to_string();
                let sub_domain = "https://www.";

                if uri.contains(sub_domain) {
                    let new_location = uri.replace(sub_domain, "https://");
                    return Ok(dev::ServiceResponse::new(
                        request.clone(),
                        HttpResponse::MovedPermanently()
                          .insert_header(("Location", new_location))
                          .finish()
                    ));
                }
              }
              res
            })
        })
        .app_data(web::Data::new(Tera::new("pages/**/*").unwrap()))
        .wrap_fn(move |req, srv| { /* Custom Error Page Handler */
            srv.call(req).map(|res| {
                if let Ok(response) = &res {
                    let request = response.request();

                    if response.status() == http::StatusCode::NOT_FOUND
                    && request.method() == http::Method::GET {
                        let tera = request.app_data::<web::Data<Tera>>();
                        let template = tera.unwrap();
                        let ctx = Context::new();
                        
                        let res_data = template.render("error/not_found.html", &ctx)
                        .map_err(|e|error::ErrorInternalServerError(e)).unwrap();
                        
                        return Ok(dev::ServiceResponse::new(
                            request.clone(),
                            HttpResponse::NotFound().content_type("text/html").body(res_data)
                        ));
                    }
                }
                res
            })
        })
        .wrap(
            /*
              Redis session manager based on Cookie
              Session data gets removed automatically from database when TTL expires.

              Visit the following link for User Manual
              https://docs.rs/actix-session/0.7.2/actix_session/struct.Session.html
            */
            SessionMiddleware::builder(
              RedisActorSessionStore::new(&redis_server),
              Key::derive_from(&private_key.as_bytes())
            )
            .cookie_secure(false)
            .cookie_http_only(true)
            .cookie_name("um-sid-otakuhub".to_owned())
            .cookie_same_site(SameSite::None)
            .cookie_content_security(CookieContentSecurity::Signed)
            .session_lifecycle(
              PersistentSession::default()
                .session_ttl(Duration::days(15))
                .session_ttl_extension_policy(TtlExtensionPolicy::OnStateChanges)
            )
            .build()
        )
        .wrap(BuiltIns::cors::get_policy())
        .wrap(ActixMiddleware::Compress::default())
        /* Custom HTTP Headers */
        .wrap(ActixMiddleware::DefaultHeaders::new().add(("X-Signature", "bitlaab")))
        .wrap(ActixMiddleware::DefaultHeaders::new().add(("X-Frame-Options", "DENY")))
        .wrap(ActixMiddleware::DefaultHeaders::new().add(
            ("Referrer-Policy", "strict-origin-when-cross-origin")
        ))
        .wrap(ActixMiddleware::DefaultHeaders::new().add(BuiltIns::csp::get_policy()))
        .service(
            StaticResource::Files::new("/assets/", "assets/")
            .prefer_utf8(true)
            .use_last_modified(true)
        )
        .wrap_fn(|req, srv| {
            /* Custom CACHE_CONTROL for Resources */
            srv.call(req).map(|mut res| {
                if let Ok(response) = &mut res {
                    let request = response.request();
                    let uri = request.uri().to_string();
                    if uri.contains("/assets/") {
                        response.headers_mut().insert(
                            http::header::CACHE_CONTROL,
                            http::header::HeaderValue::from_static(
                                "public, max-age=86400, must-revalidate"
                            )
                        );
                    }
                }
                res
            })
        })
        .service(
            StaticResource::Files::new("/components/", "components/")
            .prefer_utf8(true)
            .use_last_modified(true)
        )
        .wrap_fn(|req, srv| {
            /* Custom CACHE_CONTROL for Resources */
            srv.call(req).map(|mut res| {
                if let Ok(response) = &mut res {
                    let request = response.request();
                    let uri = request.uri().to_string();
                    if uri.contains("/components/") {
                        response.headers_mut().insert(
                            http::header::CACHE_CONTROL,
                            http::header::HeaderValue::from_static(
                                "public, max-age=86400, must-revalidate"
                            )
                        );
                    }
                }
                res
            })
        })
        .service(
            StaticResource::Files::new("/upload/", "upload/")
            .prefer_utf8(true)
            .use_last_modified(true)
        )
        .wrap_fn(|req, srv| {
            /* Custom CACHE_CONTROL for Resources */
            srv.call(req).map(|mut res| {
                if let Ok(response) = &mut res {
                    let request = response.request();
                    let uri = request.uri().to_string();
                    if uri.contains("/upload/") {
                        response.headers_mut().insert(
                            http::header::CACHE_CONTROL,
                            http::header::HeaderValue::from_static(
                                "public, max-age=86400, must-revalidate"
                            )
                        );
                    }
                }

                res
            })
        })
        .configure(Routes::Auth::router)
        .configure(Routes::Pages::router)
    });

    let http_server = if let Some(listener) = listenfd.take_tcp_listener(0)? {
        http_server.listen(listener)?
    } else {
        http_server.bind((host.as_str(), http_port.parse::<u16>().unwrap()))?
    };

    let http_server = if let Some(listener) = listenfd.take_tcp_listener(1)? {
        http_server.listen_rustls(
            listener, BuiltIns::tls::init()
        )?
    } else {
        http_server.bind_rustls(
            &format!("{host}:{https_port}"), BuiltIns::tls::init()
        )?
    };

    http_server.run().await  
}