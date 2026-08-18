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
    // Whether this shows up in the projects grid on the home page.
    #[serde(default)]
    pub featured: bool,
    pub created_at: i64,
    pub created_by: String,
    pub deleted_at: Option<i64>,
    pub deleted_by: Option<String>,
}
