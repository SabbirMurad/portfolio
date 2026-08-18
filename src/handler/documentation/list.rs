use serde::Deserialize;
use mongodb::bson::doc;
use futures_util::TryStreamExt;
use crate::Model::Documentation::Documentation;
use crate::Model::Account::AccountRole;
use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::{response::Response, regex::regex_escape};
use actix_web::{web, Error, HttpRequest, HttpResponse};

#[derive(Deserialize)]
pub struct Params {
    pub search: Option<String>,
}

// Dashboard-only — this is the admin's full list (including anything not
// currently featured on the home page), not the public docs feed.
pub async fn task(
    req: HttpRequest,
    query: web::Query<Params>,
) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let db = MongoDB.connect();
    let collection = db.collection::<Documentation>("documentation");

    let mut filter = doc! { "deleted_at": null };

    if let Some(search) = query.search.clone() {
        let search = search.trim().to_string();
        if !search.is_empty() {
            let pattern = regex_escape(&search);
            let matches = doc! { "$regex": &pattern, "$options": "i" };
            filter.insert("$or", vec![
                doc! { "name": matches.clone() },
                doc! { "description": matches.clone() },
                doc! { "tags": matches },
            ]);
        }
    }

    let cursor = collection
        .find(filter)
        .sort(doc! { "created_at": -1 })
        .await;

    let cursor = match cursor {
        Ok(c) => c,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let docs: Vec<Documentation> = match cursor.try_collect().await {
        Ok(v) => v,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    Ok(HttpResponse::Ok().content_type("application/json").json(docs))
}
