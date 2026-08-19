/*
 * Safe zip extraction, shared by the two things that accept an upload of one:
 * documentation sites (utils/mkdocs.rs) and shell bundles
 * (handler/shell/create.rs).
 *
 * "Safe" here means three specific things, each of which is a way a malicious
 * or careless archive breaks a naive extractor:
 *
 *   • entries that would land outside the target — absolute paths, `..`
 *     components — are dropped rather than sanitised, so nothing can be
 *     written where it wasn't meant to go;
 *   • the entry count and the *uncompressed* total are capped, because a zip
 *     bomb is a few KB on the wire;
 *   • a single shared top-level directory is stripped, since archives made by
 *     zipping a folder carry it and callers want the contents at the root.
 */
use std::fs;
use std::io::{Cursor, Read};
use std::path::{Path, PathBuf};
use zip::ZipArchive;

pub struct Limits {
    pub max_entries: usize,
    /// Uncompressed, summed across every file in the archive.
    pub max_total_bytes: u64,
}

/// Extract `zip_bytes` into `target_dir`, creating it if needed.
pub fn unzip(zip_bytes: &[u8], target_dir: &Path, limits: &Limits) -> Result<(), String> {
    let mut archive = ZipArchive::new(Cursor::new(zip_bytes))
        .map_err(|e| format!("Not a readable zip file: {}", e))?;

    if archive.len() > limits.max_entries {
        return Err(format!(
            "Archive has too many files (max {})",
            limits.max_entries
        ));
    }

    let strip = common_root(&archive);

    fs::create_dir_all(target_dir).map_err(|e| e.to_string())?;

    let mut total: u64 = 0;
    let mut wrote_any = false;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;

        // None for anything that would escape the target.
        let name = match entry.enclosed_name() {
            Some(p) => p.to_path_buf(),
            None => continue,
        };

        let rel = match &strip {
            Some(root) => match name.strip_prefix(root) {
                Ok(r) => r.to_path_buf(),
                Err(_) => continue,
            },
            None => name,
        };
        if rel.as_os_str().is_empty() {
            continue;
        }

        let out_path = target_dir.join(&rel);

        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
            continue;
        }

        total += entry.size();
        if total > limits.max_total_bytes {
            return Err("Archive is too large once unpacked".to_string());
        }

        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let mut buf = Vec::with_capacity(entry.size() as usize);
        entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
        fs::write(&out_path, &buf).map_err(|e| e.to_string())?;
        wrote_any = true;
    }

    if !wrote_any {
        return Err("Archive contained no files".to_string());
    }

    Ok(())
}

/// The single directory every entry sits under, if there is one — zipping a
/// `site/` or `vps-setup/` folder whole gives that. None when entries already
/// sit at the archive root, so an archive made from inside the folder works too.
fn common_root(archive: &ZipArchive<Cursor<&[u8]>>) -> Option<PathBuf> {
    let mut root: Option<String> = None;

    for name in archive.file_names() {
        let first = name.split('/').next().unwrap_or("");
        if first.is_empty() {
            return None;
        }
        // An entry with no separator after the first segment is a file at the
        // archive root, so there is no common directory to strip.
        if !name[first.len()..].starts_with('/') {
            return None;
        }
        match &root {
            None => root = Some(first.to_string()),
            Some(r) if r == first => {}
            Some(_) => return None,
        }
    }

    root.map(PathBuf::from)
}
