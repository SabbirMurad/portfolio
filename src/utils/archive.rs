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
use std::io::{Cursor, Read, Write};
use std::path::{Path, PathBuf};
use zip::write::FileOptions;
use zip::{ZipArchive, ZipWriter};

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

/// The reverse of `unzip`: pack `dir`'s contents into a zip, entries at the
/// archive root (no wrapping folder) with forward-slash paths regardless of
/// host OS — the same shape `unzip` above expects back, and what a bundle
/// uploader would get zipping the folder's contents directly.
///
/// Used by handler/shell.rs's download route: the bundle is handed out
/// exactly as uploaded, for `ct shell run` to unpack and execute on whatever
/// machine it's running on.
pub fn zip_dir(dir: &Path) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    {
        let mut writer = ZipWriter::new(Cursor::new(&mut bytes));
        add_dir(&mut writer, dir, dir)?;
        writer.finish().map_err(|e| e.to_string())?;
    }
    Ok(bytes)
}

fn add_dir<W: std::io::Write + std::io::Seek>(
    writer: &mut ZipWriter<W>,
    root: &Path,
    dir: &Path,
) -> Result<(), String> {
    let options: FileOptions = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    let entries = fs::read_dir(dir).map_err(|e| format!("{}: {}", dir.display(), e))?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let rel = path
            .strip_prefix(root)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .replace('\\', "/");

        if path.is_dir() {
            writer
                .add_directory(format!("{}/", rel), options)
                .map_err(|e| e.to_string())?;
            add_dir(writer, root, &path)?;
        } else {
            writer.start_file(rel, options).map_err(|e| e.to_string())?;
            writer
                .write_all(&fs::read(&path).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// zip_dir's whole job is producing something unzip can read straight
    /// back — including the shape unzip expects (entries at the root, no
    /// wrapping folder), since that's what a bundle download gets unpacked
    /// with on the other end (assets/cli/ct.sh).
    #[test]
    fn zip_dir_round_trips_through_unzip() {
        let src = std::env::temp_dir().join("zip_dir_round_trip_src");
        let dest = std::env::temp_dir().join("zip_dir_round_trip_dest");
        fs::remove_dir_all(&src).ok();
        fs::remove_dir_all(&dest).ok();

        fs::create_dir_all(src.join("steps")).unwrap();
        fs::write(src.join("main.sh"), "#!/bin/bash\necho hi\n").unwrap();
        fs::write(src.join("steps/01-a.sh"), "echo a\n").unwrap();

        let bytes = zip_dir(&src).expect("zip_dir should succeed");

        let limits = Limits { max_entries: 100, max_total_bytes: 1024 * 1024 };
        unzip(&bytes, &dest, &limits).expect("the result should unzip cleanly");

        assert_eq!(
            fs::read_to_string(dest.join("main.sh")).unwrap(),
            "#!/bin/bash\necho hi\n"
        );
        assert_eq!(
            fs::read_to_string(dest.join("steps/01-a.sh")).unwrap(),
            "echo a\n"
        );

        fs::remove_dir_all(&src).ok();
        fs::remove_dir_all(&dest).ok();
    }
}
