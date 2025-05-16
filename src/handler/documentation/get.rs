use crate::DOCS_ROOT;
use std::{fs, path::Path};
use actix_web::{ web, Error, HttpResponse };
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathVariables {
    project: String,
    tail: String,
}

pub async fn task(var: web::Path<PathVariables>) -> Result<HttpResponse, Error> {
    let mut tail_arr: Vec<String> = Vec::new();
    if var.tail.is_empty() {
        tail_arr.push("index.html".to_string());
    }
    else {
        let mut items: Vec<&str> = var.tail.split("/").collect();

        for item in items.clone() {
            tail_arr.push(item.to_string());
        }

        let last_item = items.pop();
        match last_item {
            Some(item) => {
                let name_part: Vec<&str> = item.split(".").collect();

                if name_part.len() < 2 {
                    tail_arr.push("index.html".to_string());
                }
            },
            None => {
                tail_arr.push("index.html".to_string());
            }
        }
    }

    let file_path = format!(
        "{}/{}/{}",
        DOCS_ROOT,
        var.project,
        tail_arr.join("/")
    );
    
    let content = match fs::read_to_string(file_path.clone()) {
        Ok(content) => content,
        Err(e) => {
            log::error!("{:?}", e);
            return Ok(HttpResponse::NotFound().finish())
        },
    };
    
    // Get extension
    let path = Path::new(&file_path);
    if let Some(extension) = path.extension() {
        let extension = extension.to_str().unwrap();
        let extension = match extension {
            "html" => "text/html; charset=utf-8",
            "css" => "text/css; charset=utf-8",
            "js" => "application/javascript",
            "woof" | "woof2" | "ttf" => &format!("font/{extension}"),
            "jpg" | "png" => &format!("image/{extension}"),
            "svg" => "image/svg+xml",
            "ico" => "image/x-icon",
            _ => "text/plain",
        };

        return Ok(
            HttpResponse::Ok()
            .content_type(extension)
            .body(content)
        );
    } else {
        Ok(HttpResponse::NotFound().finish())
    }
}