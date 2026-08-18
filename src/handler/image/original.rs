use mongodb::bson::doc;
use crate::Model::ImageStruct;
use crate::utils::response::Response;
use crate::BuiltIns::mongo::MongoDB;
use crate::builtins::sqlite;
use actix_web::{web, Error, HttpResponse};

// Public, unauthenticated — an <img src="/image/original/{uuid}"> tag can't
// attach an Authorization header.
pub async fn task(image_id: web::Path<String>) -> Result<HttpResponse, Error> {
    let image_id = image_id.trim().to_string();

    let sqlite_conn = match sqlite::connect(sqlite::DBF::IMG) {
        Ok(conn) => conn,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let result = sqlite_conn.query_row(
        "SELECT original FROM image WHERE uuid = ?1",
        [&image_id],
        |row| row.get::<usize, Vec<u8>>(0),
    );

    let image_data = match result {
        Ok(data) => data,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return Ok(Response::not_found("Image not found"));
        }
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let db = MongoDB.connect();
    let collection = db.collection::<ImageStruct>("image");
    let result = collection.find_one(doc! { "uuid": &image_id }).await;

    let image_meta = match result {
        Ok(Some(meta)) => meta,
        Ok(None) => return Ok(Response::not_found("Image not found")),
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    if image_meta.temporary || image_meta.deleted {
        return Ok(Response::not_found("Image not found"));
    }

    Ok(
        HttpResponse::Ok()
        // velora_backend's version hardcodes "image/png" here regardless of
        // the actual format — using the stored original_type instead, since
        // it's already sitting right there in image_meta.
        .content_type(image_meta.original_type)
        .body(image_data)
    )
}
