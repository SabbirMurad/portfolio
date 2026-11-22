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
    // URL segment: /documentation/<slug>/. Settled from the name when the
    // entry is created and kept through renames, so a shared or indexed link
    // keeps working. Optional because entries made before slugs existed have
    // none stored; readers fall back to slugifying the name, see
    // utils::slug::doc_slug.
    #[serde(default)]
    pub slug: Option<String>,
    pub created_at: i64,
    pub created_by: String,
    pub deleted_at: Option<i64>,
    pub deleted_by: Option<String>,
}