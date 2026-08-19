use serde::{Deserialize, Serialize};

/// An uploaded shell bundle: a directory of scripts under SHELL_ROOT with a
/// `main.sh` the /api/shell/{name} routes can drive.
///
/// `name` is both the display name and the directory, which is why it is
/// validated against handler/shell.rs's `is_valid_bundle` and has to be unique
/// — the URL /api/shell/{name}/run/... is derived from it.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ShellBundle {
    pub uuid: String,
    pub name: String,
    pub description: String,
    /// Target names read out of the bundle's own main.sh --list at upload
    /// time, so the dashboard can show what it contains without shelling out
    /// on every page load.
    #[serde(default)]
    pub targets: Vec<String>,
    pub created_at: i64,
    pub created_by: String,
    pub deleted_at: Option<i64>,
    pub deleted_by: Option<String>,
}
