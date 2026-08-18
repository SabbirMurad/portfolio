use mongodb::bson::doc;
use crate::Model::ImageStruct;
use crate::utils::response::Response;
use crate::BuiltIns::mongo::MongoDB;
use crate::builtins::sqlite;
use actix_web::{web, Error, HttpResponse};

// Public, unauthenticated — same reasoning as original.rs. This is the one
// project thumbnails actually load from (smaller than the original).
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
        "SELECT webp FROM image WHERE uuid = ?1",
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
        .content_type("image/webp")
        .body(image_data)
    )
}
