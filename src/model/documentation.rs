use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Documentation {
    pub uuid: String,
    pub name: String,
    pub tags: Vec<String>,
    pub description: String,
    // Whether this shows up in the docs section on the home page.
    // `#[serde(default)]` so documents inserted before this field existed
    // still deserialize (as not-featured) instead of erroring.
    #[serde(default)]
    pub featured: bool,
    pub view_count: i64,
    pub created_at: i64,
    pub created_by: String,
    pub deleted_at: Option<i64>,
    pub deleted_by: Option<String>,
}