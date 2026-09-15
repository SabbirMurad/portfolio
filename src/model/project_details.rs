use serde::{Deserialize, Serialize};

/// The long form of a project: what the card cannot hold.
///
/// One row per project, referenced from `Project::details_id` rather than the
/// other way round, so the feed can tell whether a card has somewhere to go
/// without a second query. `project_uuid` is kept here as well — the pairing
/// is worth being able to read from either end, and it is what the upsert
/// looks up by.
///
/// Both lists are ordered as the author arranged them and are stored as given;
/// an empty list is a page section that simply does not render.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ProjectDetails {
    pub uuid: String,
    pub project_uuid: String,
    #[serde(default)]
    pub videos: Vec<VideoLink>,
    #[serde(default)]
    pub sections: Vec<DetailSection>,
    pub created_at: i64,
    pub created_by: String,
    #[serde(default)]
    pub updated_at: Option<i64>,
    pub deleted_at: Option<i64>,
    pub deleted_by: Option<String>,
}

/// A YouTube link and the caption shown under it.
///
/// `url` is stored exactly as the author entered it — a watch link, a youtu.be
/// link or a bare id — and normalised to an embed URL when the page is built,
/// so a link pasted from the address bar works without ceremony.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct VideoLink {
    pub url: String,
    #[serde(default)]
    pub title: Option<String>,
}

/// One titled block of prose on the detail page.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DetailSection {
    pub title: String,
    pub body: String,
}
