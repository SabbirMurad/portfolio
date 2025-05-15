use std::fs;
use uuid::Uuid;
use chrono::Utc;
use zip::ZipArchive;
use std::io::Write;
use mongodb::bson::doc;
use actix_files::NamedFile;
use crate::{Model, DOCS_ROOT};
use std::path::{Path, PathBuf};
use actix_multipart::Multipart;
use crate::BuiltIns::mongo::MongoDB;
use crate::utils::response::Response;
use serde::{ Serialize, Deserialize };
use actix_web::{get, post, web, App, Error, HttpResponse, HttpServer, Result};
use futures_util::stream::StreamExt as _;

//in minutes
const CODE_EXPIRE_TIME: i64 = 15;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBody {
    name: String,
    file: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ResponseBody {
    uuid: String,
    name: String,
}


pub async fn task(form_data: web::Json<RequestBody>) -> Result<HttpResponse, Error> {
    /* DATABASE ACID SESSION INIT */

    let (db, mut session) = MongoDB.connect_acid().await;
    if let Err(error) = session.start_transaction().await {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    //Checking if the document name already exist
    let doc_id = Uuid::now_v7().to_string();
    let doc_name = form_data.name.trim().to_string();
    let now = Utc::now().timestamp_millis();

    let collection = db.collection::
    <Model::Documentation::Documentation>("documentation");

    let result = collection.find_one(
        doc!{"name": &doc_name},
    ).await;

    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    if let Some(_) = result.unwrap() {
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::bad_request("Document name already exist"));
    }

    // Creating the document data
    let document = Model::Documentation::Documentation {
        uuid: doc_id.clone(),
        name: doc_name.clone(),
        view_count: 0,
        created_at: now,
        created_by: "admin".to_string(),
        deleted_at: None,
        deleted_by: None,
    };

    let result = collection.insert_one(document).await;
    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    // Writing the file to the machine
    let result = fs::write(
        format!("./documentation/{}.zip", doc_name),
        form_data.file.clone()
    );
    
    if let Err(error) = result {
        log::error!("{:?}", error);
        session.abort_transaction().await.ok().unwrap();
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let res = ResponseBody {
        uuid: doc_id.clone(),
        name: doc_name.clone(),
    };

    Ok(HttpResponse::Ok().content_type("application/json").json(res))
}



// #[post("/upload")]
// async fn upload(mut payload: Multipart) -> Result<HttpResponse, Error> {
//         let field = payload.next().await;
//         if field.is_none() {
//             return Ok(Response::bad_request("No file uploaded"));
//         }

//         let field = field.unwrap();
//         let content_disposition = field?.content_disposition().unwrap();
//         let filename = content_disposition
//             .get_filename()
//             .unwrap_or("uploaded.zip");
//         let project_name = filename.trim_end_matches(".zip");

//         let save_path = format!("/tmp/{}", filename.clone());
//         let save_path_2 = format!("/tmp/{}", filename.clone());
//         let mut f = web::block(move || std::fs::File::create(&save_path_2)).await??;

//         while let Some(chunk) = field?.next().await {
//             let data = chunk?;
//             f.write_all(&data)?;
//         }

//         // Extract zip to DOCS_ROOT/project_name
//         let target_dir = format!("{}/{}", DOCS_ROOT, project_name);
//         fs::create_dir_all(&target_dir)?;

//         let zipfile = std::fs::File::open(&save_path.clone())?;
//         let mut archive = match  ZipArchive::new(zipfile) {
//             Ok(archive) => archive,
//             Err(error) => {
//                 fs::remove_file(&save_path)?; // Clean up
//                 return Ok(Response::internal_server_error(&error.to_string()));
//             }
//         };

//         for i in 0..archive.len() {
//             let mut file = match archive.by_index(i) {
//                 Ok(file) => file,
//                 Err(error) => {
//                     fs::remove_file(&save_path)?; // Clean up
//                     return Ok(Response::internal_server_error(&error.to_string()));
//                 }
//             };

//             let outpath = Path::new(&target_dir).join(file.sanitized_name());

//             if file.name().ends_with('/') {
//                 fs::create_dir_all(&outpath)?;
//             } else {
//                 if let Some(p) = outpath.parent() {
//                     fs::create_dir_all(p)?;
//                 }
//                 let mut outfile = std::fs::File::create(&outpath)?;
//                 std::io::copy(&mut file, &mut outfile)?;
//             }
//         }

//         fs::remove_file(&save_path)?; // Clean up

//     Ok(HttpResponse::Ok().body("Upload and extraction complete"))
// }