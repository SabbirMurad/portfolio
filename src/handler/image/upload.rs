/*
 * Storage pattern ported from velora_backend's src/handler/image/upload.rs:
 * metadata (dimensions, type, used_at, ...) goes into Mongo as ImageStruct,
 * sqlite holds only the original + webp blobs. This replaces the previous
 * approach (builtins/image.rs, now deleted) where everything — blob and
 * metadata alike — lived in one sqlite row.
 *
 * Kept simple relative to velora's own version: this only ever takes one
 * "image" field (a project thumbnail, not a multi-image gallery post), and
 * width/height/type are derived from the bytes server-side rather than
 * trusted from client-supplied text fields — there's no blurhash generation
 * on the dashboard to justify pushing that computation onto the client.
 */
use uuid::Uuid;
use chrono::Utc;
use futures_util::StreamExt as _;
use webp::Encoder;
use mongodb::bson::doc;
use actix_multipart::Multipart;
use actix_web::{Error, HttpRequest, HttpResponse};
use image::io::Reader as ImageReader;
use crate::Model::{AllowedImageType, ImageStruct, AssetUsedAt};
use crate::Model::Account::AccountRole;
use crate::BuiltIns::mongo::MongoDB;
use crate::builtins::sqlite;
use crate::Middleware::Auth::{require_access, AccessRequirement};
use crate::utils::response::Response;

const FIELD_NAME: &str = "image";
const MAX_FILE_BYTES: usize = 8 * 1024 * 1024; // 8 MB — a thumbnail, not a gallery

pub async fn task(req: HttpRequest, mut payload: Multipart) -> Result<HttpResponse, Error> {
    require_access(&req, AccessRequirement::Role(AccountRole::Administrator))?;

    let mut bytes: Vec<u8> = Vec::new();
    let mut found = false;

    while let Some(item) = payload.next().await {
        let mut field = item?;

        let field_name = field
            .content_disposition()
            .and_then(|cd| cd.get_name())
            .map(|s| s.to_string());

        if field_name.as_deref() != Some(FIELD_NAME) {
            while field.next().await.is_some() {}
            continue;
        }

        found = true;
        while let Some(chunk) = field.next().await {
            let data = chunk?;
            bytes.extend_from_slice(&data);
            if bytes.len() > MAX_FILE_BYTES {
                return Ok(Response::bad_request("Image is too large (max 8MB)"));
            }
        }
    }

    if !found || bytes.is_empty() {
        return Ok(Response::bad_request("Missing image file"));
    }

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

    let (width, height) = match imagesize::blob_size(&bytes) {
        Ok(size) => (size.width, size.height),
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::bad_request("Invalid image dimensions"));
        }
    };

    let webp_bytes = match convert_to_webp(bytes.clone()) {
        Ok(b) => b,
        Err(error) => {
            log::error!("{}", error);
            return Ok(Response::bad_request("Could not process the image"));
        }
    };

    let uuid = Uuid::now_v7().to_string();
    let image_doc = ImageStruct {
        uuid: uuid.clone(),
        height,
        width,
        original_size: bytes.len(),
        webp_size: webp_bytes.len(),
        blur_hash: String::new(),
        used_at: AssetUsedAt::ProjectThumbnail,
        original_type: image_type.to_str().to_string(),
        temporary: false,
        deleted: false,
        created_at: Utc::now().timestamp_millis(),
    };

    let db = MongoDB.connect();
    let collection = db.collection::<ImageStruct>("image");
    if let Err(error) = collection.insert_one(image_doc.clone()).await {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let sqlite_conn = match sqlite::connect(sqlite::DBF::IMG) {
        Ok(conn) => conn,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    let result = sqlite_conn.execute(
        "INSERT INTO image (uuid, original, webp) VALUES (?1, ?2, ?3)",
        (&uuid, &bytes, &webp_bytes),
    );

    if let Err(error) = result {
        log::error!("{:?}", error);
        // The blob write failed — don't leave a metadata doc pointing at
        // nothing behind (velora_backend's version doesn't clean this up;
        // worth doing here since nothing else will).
        let _ = collection.delete_one(doc! { "uuid": &uuid }).await;
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    Ok(HttpResponse::Ok().content_type("application/json").json(image_doc))
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
