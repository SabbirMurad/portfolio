/*
 * Multipart image upload, following fanari_backend's src/handler/image/upload.rs:
 * one request can carry several images, each file part paired with text parts
 * that carry its metadata, matched up by a trailing index.
 *
 *   image_0      (file)  the bytes
 *   width_0      (text)  natural width, from the client
 *   height_0     (text)  natural height, from the client
 *   blur_hash_0  (text)  BlurHash string, computed client-side
 *   used_at_0    (text)  an AssetUsedAt variant name
 *   temporary_0  (text)  "true" | "false"
 *   uuid_0       (text)  optional; the server generates one when absent
 *
 * width/height/blur_hash come from the client because the client has already
 * decoded the image to preview it — re-decoding server-side to recover numbers
 * the browser already knows is work for nothing, and blurhash has no crate
 * wired up here at all. The trade is that these are now caller-supplied: they
 * describe the image, they don't gate it. The things that *do* gate it are
 * still read from the bytes — original_type via imghdr, the sizes from the
 * buffers — so a client can misreport its dimensions but not smuggle in a
 * non-image.
 *
 * Two deliberate departures from fanari's version: every missing or malformed
 * field answers 400 instead of unwrapping (a panic on a crafted request is a
 * free denial of service), and a failure part-way through a multi-image request
 * removes the rows already written for that request rather than leaving them
 * orphaned.
 */
use crate::builtins::sqlite;
use crate::utils::response::Response;
use crate::BuiltIns::mongo::MongoDB;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::Model::Account::AccountRole;
use crate::Model::{AllowedImageType, AssetUsedAt, ImageStruct};
use actix_multipart::Multipart;
use actix_web::{Error, HttpRequest, HttpResponse};
use chrono::Utc;
use futures_util::StreamExt as _;
use image::io::Reader as ImageReader;
use mongodb::bson::doc;
use std::collections::HashMap;
use uuid::Uuid;
use webp::Encoder;

/// Per-file ceiling. Thumbnails, not gallery originals.
const MAX_FILE_BYTES: usize = 8 * 1024 * 1024;
/// Whole-request ceiling, so "several images" can't mean fifty.
const MAX_TOTAL_BYTES: usize = 32 * 1024 * 1024;
const MAX_IMAGES: usize = 8;

pub async fn task(req: HttpRequest, mut payload: Multipart) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    // (index, bytes) for file parts; "width_0" -> "1472" for text parts.
    let mut images: Vec<(usize, Vec<u8>)> = Vec::new();
    let mut fields: HashMap<String, String> = HashMap::new();
    let mut total: usize = 0;

    while let Some(item) = payload.next().await {
        let mut field = item?;

        let (name, is_file) = {
            let cd = match field.content_disposition() {
                Some(cd) => cd,
                None => return Ok(Response::bad_request("Missing content disposition")),
            };
            match cd.get_name() {
                Some(n) => (n.to_string(), cd.get_filename().is_some()),
                None => return Ok(Response::bad_request("Missing field name")),
            }
        };

        let mut bytes: Vec<u8> = Vec::new();
        while let Some(chunk) = field.next().await {
            bytes.extend_from_slice(&chunk?);

            if is_file && bytes.len() > MAX_FILE_BYTES {
                return Ok(Response::bad_request("Image is too large (max 8MB)"));
            }
            if total + bytes.len() > MAX_TOTAL_BYTES {
                return Ok(Response::bad_request("Upload is too large"));
            }
        }

        if is_file {
            let index = match suffix_index(&name) {
                Some(i) => i,
                None => {
                    return Ok(Response::bad_request(
                        "File fields must be named image_<n>, e.g. image_0",
                    ))
                }
            };
            if images.len() >= MAX_IMAGES {
                return Ok(Response::bad_request("Too many images in one request"));
            }
            total += bytes.len();
            images.push((index, bytes));
        } else {
            fields.insert(name, String::from_utf8_lossy(&bytes).to_string());
        }
    }

    if images.is_empty() {
        return Ok(Response::bad_request("Missing image file"));
    }

    // Everything is validated before a single row is written, so a bad field on
    // the last image doesn't leave the first one half-committed.
    let mut prepared: Vec<(ImageStruct, Vec<u8>, Vec<u8>)> = Vec::new();
    let created_at = Utc::now().timestamp_millis();

    for (index, bytes) in images.into_iter() {
        let width: usize = match parse_field(&fields, "width", index) {
            Ok(v) => v,
            Err(res) => return Ok(res),
        };
        let height: usize = match parse_field(&fields, "height", index) {
            Ok(v) => v,
            Err(res) => return Ok(res),
        };
        let temporary: bool = match parse_field(&fields, "temporary", index) {
            Ok(v) => v,
            Err(res) => return Ok(res),
        };

        let blur_hash = match fields.get(&key("blur_hash", index)) {
            Some(v) => v.clone(),
            None => return Ok(missing("blur_hash", index)),
        };
        let used_at = match fields.get(&key("used_at", index)) {
            Some(v) => v.clone(),
            None => return Ok(missing("used_at", index)),
        };

        if width == 0 || height == 0 {
            return Ok(Response::bad_request("Image dimensions must be non-zero"));
        }

        // Client-supplied uuid is honoured (fanari does the same, so a caller
        // can reference an image before the upload finishes), but it has to be
        // a real uuid rather than an arbitrary string used as a sqlite key.
        let uuid = match fields.get(&key("uuid", index)) {
            Some(v) if !v.trim().is_empty() => match Uuid::parse_str(v.trim()) {
                Ok(parsed) => parsed.to_string(),
                Err(_) => return Ok(Response::bad_request("uuid field is not a valid uuid")),
            },
            _ => Uuid::now_v7().to_string(),
        };

        // Read off the bytes, not the request: this is what decides whether the
        // upload is an image at all.
        let image_type = match imghdr::from_bytes(&bytes) {
            Some(t) => match t {
                imghdr::Type::Gif => AllowedImageType::Gif,
                imghdr::Type::Png => AllowedImageType::Png,
                imghdr::Type::Jpeg => AllowedImageType::Jpeg,
                imghdr::Type::Webp => AllowedImageType::Webp,
                _ => return Ok(Response::bad_request("Unsupported image format")),
            },
            None => return Ok(Response::bad_request("Invalid image format")),
        };

        let webp_bytes = match convert_to_webp(bytes.clone()) {
            Ok(b) => b,
            Err(error) => {
                log::error!("{}", error);
                return Ok(Response::bad_request("Could not process the image"));
            }
        };

        prepared.push((
            ImageStruct {
                uuid,
                width,
                height,
                blur_hash,
                original_size: bytes.len(),
                webp_size: webp_bytes.len(),
                used_at: AssetUsedAt::from_str(&used_at),
                original_type: image_type.to_str().to_string(),
                temporary,
                deleted: false,
                created_at,
            },
            bytes,
            webp_bytes,
        ));
    }

    let db = MongoDB.connect();
    let collection = db.collection::<ImageStruct>("image");

    let sqlite_conn = match sqlite::connect(sqlite::DBF::IMG) {
        Ok(conn) => conn,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let mut written: Vec<String> = Vec::new();
    let mut stored: Vec<ImageStruct> = Vec::new();

    for (image_doc, bytes, webp_bytes) in prepared.into_iter() {
        if let Err(error) = collection.insert_one(image_doc.clone()).await {
            log::error!("{:?}", error);
            rollback(&collection, &sqlite_conn, &written).await;
            return Ok(Response::internal_server_error(&error.to_string()));
        }
        written.push(image_doc.uuid.clone());

        let result = sqlite_conn.execute(
            "INSERT INTO image (uuid, original, webp) VALUES (?1, ?2, ?3)",
            (&image_doc.uuid, &bytes, &webp_bytes),
        );

        if let Err(error) = result {
            log::error!("{:?}", error);
            rollback(&collection, &sqlite_conn, &written).await;
            return Ok(Response::internal_server_error(&error.to_string()));
        }

        stored.push(image_doc);
    }

    // fanari answers with just the ids; the whole record goes back here so the
    // caller gets webp_size and original_type without a second request.
    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .json(stored))
}

/* ── helpers ── */

fn key(field: &str, index: usize) -> String {
    format!("{}_{}", field, index)
}

fn missing(field: &str, index: usize) -> HttpResponse {
    Response::bad_request(&format!("Missing field {}", key(field, index)))
}

/// The `_0` on `image_0`. None when there is no trailing number.
fn suffix_index(field_name: &str) -> Option<usize> {
    field_name
        .rsplit_once('_')
        .and_then(|(_, i)| i.parse().ok())
}

fn parse_field<T: std::str::FromStr>(
    fields: &HashMap<String, String>,
    field: &str,
    index: usize,
) -> Result<T, HttpResponse> {
    let name = key(field, index);
    let raw = match fields.get(&name) {
        Some(v) => v.trim(),
        None => return Err(missing(field, index)),
    };
    raw.parse::<T>()
        .map_err(|_| Response::bad_request(&format!("Field {} is not valid", name)))
}

/// Undo the rows this request already wrote. Best-effort: it runs on a path
/// that is already failing, so an error here is logged and swallowed rather
/// than replacing the original one.
async fn rollback(
    collection: &mongodb::Collection<ImageStruct>,
    sqlite_conn: &rusqlite::Connection,
    uuids: &[String],
) {
    for uuid in uuids {
        if let Err(error) = collection.delete_one(doc! { "uuid": uuid }).await {
            log::error!("rollback (mongo) {}: {:?}", uuid, error);
        }
        if let Err(error) = sqlite_conn.execute("DELETE FROM image WHERE uuid = ?1", (uuid,)) {
            log::error!("rollback (sqlite) {}: {:?}", uuid, error);
        }
    }
}

fn convert_to_webp(image_bytes: Vec<u8>) -> Result<Vec<u8>, String> {
    let reader = ImageReader::new(std::io::Cursor::new(image_bytes))
        .with_guessed_format()
        .map_err(|e| e.to_string())?;

    let img = reader.decode().map_err(|e| e.to_string())?;

    // RGBA preserves transparency.
    let rgba = img.to_rgba8();

    let encoder = Encoder::from_rgba(&rgba, img.width(), img.height());
    let webp = encoder.encode(80.0);

    Ok(webp.to_vec())
}
