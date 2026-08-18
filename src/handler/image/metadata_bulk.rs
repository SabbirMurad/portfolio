use mongodb::bson::doc;
use futures_util::TryStreamExt;
use crate::Model::ImageStruct;
use crate::BuiltIns::mongo::MongoDB;
use crate::utils::response::Response;
use actix_web::{web, Error, HttpResponse};

pub async fn task(image_ids: web::Json<Vec<String>>) -> Result<HttpResponse, Error> {
    let db = MongoDB.connect();
    let collection = db.collection::<ImageStruct>("image");

    let cursor = collection.find(doc! { "uuid": { "$in": image_ids.clone() } }).await;

    let cursor = match cursor {
        Ok(c) => c,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let images: Vec<ImageStruct> = match cursor.try_collect().await {
        Ok(v) => v,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    Ok(HttpResponse::Ok().content_type("application/json").json(images))
}
