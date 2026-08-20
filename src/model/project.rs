use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Project {
    pub uuid: String,
    pub title: String,
    pub subtitle: String,
    pub description: String,
    pub tags: Vec<String>,
    // uuid of a row in the sqlite `image` table, created via
    // POST /api/image/upload beforehand — this model never stores raw bytes.
    pub image_id: String,
    // Where the card's anchor points. Optional because entries written before
    // the field existed have to keep deserializing; a card without one is
    // rendered as plain markup rather than a link that goes nowhere.
    #[serde(default)]
    pub link: Option<String>,
    // Hex accent for the card's dot and its no-banner gradient. Falls back to
    // the site's vermilion when unset.
    #[serde(default)]
    pub accent: Option<String>,
    // The year printed on the card. Distinct from `created_at`, which is when
    // the entry was made here, not when the work was done.
    #[serde(default)]
    pub year: Option<String>,
    // Whether this shows up in the projects grid on the home page.
    #[serde(default)]
    pub featured: bool,
    pub created_at: i64,
    pub created_by: String,
    pub deleted_at: Option<i64>,
    pub deleted_by: Option<String>,
}
