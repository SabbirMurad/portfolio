//! Puts two projects into the local database so the detail page can be looked
//! at with real content: Fireball, which has a detail page, and Bambe, which
//! doesn't (its card still links straight out).
//!
//!   cargo run --release --example seed_showcase
//!   cargo run --release --example seed_showcase -- clean
//!
//! Banners are the .webp files already in assets/image/projects, written into
//! the same two places an upload writes to: the blobs into sqlite's `image`
//! table, the metadata into Mongo's `image` collection.
//!
//! A scaffold for looking at the design, not part of the app — delete when done.

use dotenv::dotenv;
use mongodb::bson::doc;
use mongodb::{Client, Database};
use rusqlite::Connection;

struct Seed {
    project_uuid: &'static str,
    image_uuid: &'static str,
    file: &'static str,
    width: usize,
    height: usize,
}

const FIREBALL: Seed = Seed {
    project_uuid: "seed-fireball",
    image_uuid: "seed-image-fireball",
    file: "assets/image/projects/fireball.webp",
    width: 1472,
    height: 560,
};

const BAMBE: Seed = Seed {
    project_uuid: "seed-bambe",
    image_uuid: "seed-image-bambe",
    file: "assets/image/projects/bambe.webp",
    width: 1472,
    height: 560,
};

const DETAILS_UUID: &str = "seed-details-fireball";
const NOW: i64 = 1_757_000_000_000;

async fn connect() -> Database {
    dotenv().ok();
    let host = std::env::var("MONGO_HOST").expect("MONGO_HOST");
    let port = std::env::var("MONGO_PORT").expect("MONGO_PORT");
    let client = Client::with_uri_str(format!("mongodb://{}:{}", host, port))
        .await
        .expect("mongo connect");
    client.database("portfolio")
}

fn sqlite() -> Connection {
    let path = std::env::var("SQLITE_IMG_PATH").expect("SQLITE_IMG_PATH");
    let conn = Connection::open(path).expect("open image db");

    // This database predates the blobs-only schema in builtins/sqlite.rs: it
    // still has the old (type, data, height, width, size, ...) columns, and
    // CREATE TABLE IF NOT EXISTS never touched it because the table was
    // already there. Nothing reads or writes those columns any more — upload
    // inserts (uuid, original, webp) and the serving handlers select `webp` —
    // so the table is rebuilt to match. Guarded on being empty: this drops
    // rows if there ever are any.
    let columns: Vec<String> = {
        let mut stmt = conn.prepare("PRAGMA table_info(image)").expect("table_info");
        let rows = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .expect("read columns");
        rows.filter_map(|r| r.ok()).collect()
    };

    if !columns.is_empty() && !columns.iter().any(|c| c == "webp") {
        let count: i64 = conn
            .query_row("SELECT count(*) FROM image", [], |row| row.get(0))
            .unwrap_or(0);
        assert_eq!(count, 0, "image table has {} rows on the old schema — migrate, don't drop", count);

        conn.execute("DROP TABLE image", []).expect("drop stale image table");
        println!("rebuilt the empty `image` table on the schema the code expects");
    }

    conn.execute(
        "CREATE TABLE IF NOT EXISTS image (
            uuid          TEXT PRIMARY KEY,
            original      BLOB NOT NULL,
            webp          BLOB NOT NULL
        );",
        [],
    )
    .expect("create image table");

    conn
}

async fn put_image(db: &Database, conn: &Connection, seed: &Seed) {
    let bytes = std::fs::read(seed.file).unwrap_or_else(|_| panic!("read {}", seed.file));

    conn.execute("DELETE FROM image WHERE uuid = ?1", [seed.image_uuid]).ok();
    conn.execute(
        "INSERT INTO image (uuid, original, webp) VALUES (?1, ?2, ?3)",
        rusqlite::params![seed.image_uuid, bytes, bytes],
    )
    .expect("insert blob");

    let images = db.collection::<mongodb::bson::Document>("image");
    images.delete_many(doc! { "uuid": seed.image_uuid }).await.ok();
    images
        .insert_one(doc! {
            "uuid": seed.image_uuid,
            "height": seed.height as i64,
            "width": seed.width as i64,
            "original_size": bytes.len() as i64,
            "webp_size": bytes.len() as i64,
            // Encoded in the browser on a real upload; the banner falls back to
            // its accent gradient while the file loads without one.
            "blur_hash": "",
            "used_at": "ProjectThumbnail",
            "original_type": "Webp",
            "temporary": false,
            "deleted": false,
            "created_at": NOW,
        })
        .await
        .expect("insert image metadata");
}

#[tokio::main]
async fn main() {
    let db = connect().await;
    let conn = sqlite();
    let clean = std::env::args().nth(1).as_deref() == Some("clean");

    let projects = db.collection::<mongodb::bson::Document>("project");
    let details = db.collection::<mongodb::bson::Document>("project_details");
    let images = db.collection::<mongodb::bson::Document>("image");

    if clean {
        for seed in [&FIREBALL, &BAMBE] {
            projects.delete_many(doc! { "uuid": seed.project_uuid }).await.ok();
            images.delete_many(doc! { "uuid": seed.image_uuid }).await.ok();
            conn.execute("DELETE FROM image WHERE uuid = ?1", [seed.image_uuid]).ok();
        }
        details.delete_many(doc! { "uuid": DETAILS_UUID }).await.ok();
        println!("removed the seeded projects, their details and their images");
        return;
    }

    put_image(&db, &conn, &FIREBALL).await;
    put_image(&db, &conn, &BAMBE).await;

    for seed in [&FIREBALL, &BAMBE] {
        projects.delete_many(doc! { "uuid": seed.project_uuid }).await.ok();
    }
    details.delete_many(doc! { "uuid": DETAILS_UUID }).await.ok();

    projects
        .insert_one(doc! {
            "uuid": FIREBALL.project_uuid,
            "title": "Fireball",
            "subtitle": "camera hand tracking",
            "description": "Live hand tracking on the camera feed — MediaPipe's 21-point skeleton drawn over every frame, in real time. Close your fist and open it and a fireball lights in that palm; flick the hand and the fire is let go along the hand's own path.",
            "tags": ["flutter", "kotlin", "mediapipe", "camerax"],
            "image_id": FIREBALL.image_uuid,
            "link": "https://github.com/SabbirMurad/fireball",
            "accent": "#ff6a1f",
            "year": "2026",
            "featured": true,
            "slug": "fireball",
            "details_id": DETAILS_UUID,
            "created_at": NOW,
            "created_by": "seed",
            "deleted_at": null,
            "deleted_by": null,
        })
        .await
        .expect("insert fireball");

    // No details_id: the card links straight out, the way every project did
    // before detail pages existed.
    projects
        .insert_one(doc! {
            "uuid": BAMBE.project_uuid,
            "title": "Bambe",
            "subtitle": "e-commerce storefront",
            "description": "A storefront served from Rust — browse and search the catalogue, wishlist, cart and check out, with accounts, orders and returns, and an admin console behind it.",
            "tags": ["rust", "actix web", "tera", "javascript"],
            "image_id": BAMBE.image_uuid,
            "link": "https://github.com/SabbirMurad/bambe",
            "accent": "#faaa39",
            "year": "2026",
            "featured": true,
            "slug": "bambe",
            "details_id": null,
            "created_at": NOW - 86_400_000,
            "created_by": "seed",
            "deleted_at": null,
            "deleted_by": null,
        })
        .await
        .expect("insert bambe");

    details
        .insert_one(doc! {
            "uuid": DETAILS_UUID,
            "project_uuid": FIREBALL.project_uuid,
            "videos": [
                { "url": "https://www.youtube.com/watch?v=aqz-KE-bpKQ", "title": "Lighting and throwing the fireball" },
                { "url": "https://youtu.be/dQw4w9WgXcQ", "title": null },
            ],
            "sections": [
                {
                    "title": "Tracking the hand",
                    "body": "MediaPipe's hand landmarker runs against every frame the camera gives us and returns 21 points per hand — knuckles, joints, fingertips — in normalised image space.\n\nThe overlay is drawn in the same pass as the frame it describes, so the skeleton never trails the hand by a frame. On a mid-range Android that leaves enough headroom to run the gesture check on top without dropping below 30fps."
                },
                {
                    "title": "Lighting the fire",
                    "body": "A closed fist that opens is the gesture. The palm's centroid becomes the anchor, and the sprite is composited in screen blend mode so the flame reads as light rather than as a sticker sitting on top of the picture."
                },
                {
                    "title": "Throwing it",
                    "body": "Release is a flick: the wrist's velocity over the last few frames sets the direction and the speed. The fireball then arcs along that vector until another open palm catches it or it burns out."
                },
            ],
            "created_at": NOW,
            "created_by": "seed",
            "updated_at": null,
            "deleted_at": null,
            "deleted_by": null,
        })
        .await
        .expect("insert details");

    println!("seeded /projects/fireball (with a detail page) and Bambe (without one)");
}
