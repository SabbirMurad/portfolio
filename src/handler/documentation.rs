pub mod get;
pub use get as Get;

pub mod delete;
pub use delete as Delete;

pub mod create;
pub use create as Create;

pub mod list;
pub use list as List;

pub mod feed;
pub use feed as Feed;

pub mod toggle_featured;
pub use toggle_featured as ToggleFeatured;

pub mod update;
pub use update as Update;

use mongodb::bson::doc;
use futures_util::TryStreamExt;
use crate::Model::Documentation::Documentation;
use crate::BuiltIns::mongo::MongoDB;
use crate::utils::slug::doc_slug;


/// Every live entry. There are a handful, so reading them all and comparing
/// in memory is simpler than storing a slug on legacy rows first.
pub async fn live_docs() -> Result<Vec<Documentation>, String> {
    let db = MongoDB.connect();
    let cursor = db
        .collection::<Documentation>("documentation")
        .find(doc! { "deleted_at": null })
        .await
        .map_err(|e| e.to_string())?;
    cursor.try_collect().await.map_err(|e| e.to_string())
}

/// The uuid of the live entry served at `/documentation/{slug}/`. Files are
/// stored under the uuid; the slug is only the URL.
pub fn resolve(docs: &[Documentation], slug: &str) -> Option<String> {
    docs.iter()
        .find(|d| doc_slug(&d.slug, &d.name) == slug)
        .map(|d| d.uuid.clone())
}

/// A slug for a new entry named `name`, unique among `docs`. Falls back to
/// the uuid when the name has nothing URL-safe in it.
pub fn unique_slug(docs: &[Documentation], name: &str, uuid: &str) -> String {
    let base = crate::utils::slug::slugify(name);
    if base.is_empty() {
        return uuid.to_string();
    }
    let taken = |s: &str| docs.iter().any(|d| doc_slug(&d.slug, &d.name) == s);
    if !taken(&base) {
        return base;
    }
    (2..)
        .map(|n| format!("{base}-{n}"))
        .find(|s| !taken(s))
        .unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(uuid: &str, name: &str, slug: Option<&str>) -> Documentation {
        Documentation {
            uuid: uuid.into(),
            name: name.into(),
            tags: vec![],
            description: String::new(),
            featured: false,
            view_count: 0,
            slug: slug.map(Into::into),
            created_at: 0,
            created_by: "admin".into(),
            deleted_at: None,
            deleted_by: None,
        }
    }

    #[test]
    fn a_slug_finds_its_entry_and_a_uuid_does_not() {
        let docs = vec![
            entry("u1", "Vps Configuration for Rust Server", Some("vps-configuration-for-rust-server")),
            entry("u2", "Renamed Since", Some("original-name")),
            entry("u3", "No Stored Slug", None),
        ];
        assert_eq!(resolve(&docs, "vps-configuration-for-rust-server").as_deref(), Some("u1"));
        // A rename keeps the stored slug.
        assert_eq!(resolve(&docs, "original-name").as_deref(), Some("u2"));
        assert_eq!(resolve(&docs, "renamed-since"), None);
        // Legacy rows answer to the name slugified.
        assert_eq!(resolve(&docs, "no-stored-slug").as_deref(), Some("u3"));
        assert_eq!(resolve(&docs, "u1"), None);
    }

    #[test]
    fn new_slugs_do_not_collide() {
        let docs = vec![entry("u1", "Rust Setup", Some("rust-setup")), entry("u2", "x", Some("rust-setup-2"))];
        assert_eq!(unique_slug(&docs, "Rust Setup!", "u9"), "rust-setup-3");
        assert_eq!(unique_slug(&docs, "Nginx", "u9"), "nginx");
        assert_eq!(unique_slug(&docs, "রেজিউমি", "u9"), "u9");
    }
}
