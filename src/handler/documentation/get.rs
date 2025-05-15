use std::{fs, path::Path};
use serde_json::json;
use crate::DOCS_ROOT;
use std::path::PathBuf;
use actix_files::NamedFile;
use actix_web::{ web, Error, HttpResponse };
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathVariables {
    project: String,
    tail: String,
}

pub async fn task(var: web::Path<PathVariables>) -> Result<HttpResponse, Error> {
    let mut path = PathBuf::from(DOCS_ROOT);
    path.push(&var.project);
    path.push(if var.tail.is_empty() {
        "index.html"
    } else {
        &var.tail
    });

    let file_path = if path.is_dir() {
        path.join("index.html")
    } else {
        path
    };

    let file_path = format!(".{}",file_path.to_str().unwrap());
    println!("\n{:?}\n",file_path);

    let content = fs::read_to_string(file_path.clone())?;

    // Get extension
    let path = Path::new(&file_path);
    if let Some(extension) = path.extension() {
        return Ok(
            HttpResponse::Ok()
            .content_type(extension.to_str().unwrap())
            .body(content)
        );
    } else {
        Ok(HttpResponse::NotFound().finish())
    }
}