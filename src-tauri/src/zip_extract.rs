use crate::types::ExtractionProgress;
use std::fs;
use std::io;
use std::path::{Component, Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};

const IMAGE_EXTENSIONS: &[&str] = &[".png", ".jpg", ".jpeg", ".tiff", ".tif", ".exr", ".dpx"];

pub fn is_image_file_name(file_name: &str) -> bool {
    let lower = file_name.to_lowercase();
    IMAGE_EXTENSIONS.iter().any(|ext| lower.ends_with(ext))
}

pub fn extract_zip_file(
    app: &AppHandle,
    zip_path: &str,
    extract_to: &Path,
    _zip_index: usize,
    zip_count: usize,
    files_already_extracted: usize,
) -> Result<Vec<String>, String> {
    let file = fs::File::open(zip_path).map_err(|e| format!("Failed to open zip: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip: {}", e))?;

    // Count total image entries across all zips (estimate)
    let total_image_entries: usize = (0..archive.len())
        .filter_map(|i| {
            archive.by_index(i).ok().map(|file| {
                let name = file.name();
                if file.is_file() && is_image_file_name(name) {
                    1
                } else {
                    0
                }
            })
        })
        .sum();

    let window = app.get_webview_window("main");
    let mut extracted_files = Vec::new();
    let mut current_file = 0usize;

    fs::create_dir_all(extract_to).map_err(|e| format!("Failed to create extract dir: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let raw_name = file.name().to_string();

        if file.is_dir() {
            continue;
        }

        if !is_image_file_name(&raw_name) {
            continue;
        }

        current_file += 1;
        let overall_current = files_already_extracted + current_file;
        let overall_total = if zip_count > 1 {
            // We don't know total across all zips, use this zip's total as estimate
            total_image_entries
        } else {
            total_image_entries
        };

        let percentage = if overall_total > 0 {
            ((overall_current as f64 / overall_total as f64) * 95.0).min(95.0)
        } else {
            0.0
        };

        let file_name = Path::new(&raw_name)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(&raw_name)
            .to_string();

        let zip_label = Path::new(zip_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("zip");

        if let Some(window) = window.as_ref() {
            let _ = window.emit(
                "extraction-progress",
                &ExtractionProgress {
                    current_file: overall_current,
                    total_files: overall_total,
                    percentage,
                    current_file_name: format!("{}: {}", zip_label, file_name),
                },
            );
        }

        // Build a sanitized relative path from the zip entry, preserving
        // subdirectories for disambiguation but stripping any components that
        // could escape the extraction dir (Zip Slip protection).
        let mut output_relative = PathBuf::new();
        for component in Path::new(&raw_name).components() {
            if let Component::Normal(part) = component {
                output_relative.push(part);
            }
        }
        // Fall back to the bare file name if sanitization emptied the path.
        if output_relative.as_os_str().is_empty() {
            output_relative = PathBuf::from(&file_name);
        }

        let output_path = extract_to.join(&output_relative);

        // Ensure parent directory exists
        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        // Detect collisions by appending a suffix if file already exists
        let final_output_path = if output_path.exists() {
            let stem = output_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("file")
                .to_string();
            let ext = output_path.extension().and_then(|e| e.to_str()).unwrap_or("");
            let mut counter = 1;
            let mut candidate = output_path.clone();
            while candidate.exists() {
                let new_name = if ext.is_empty() {
                    format!("{}_{}", stem, counter)
                } else {
                    format!("{}_{}.{}", stem, counter, ext)
                };
                candidate = output_path.with_file_name(new_name);
                counter += 1;
            }
            candidate
        } else {
            output_path
        };

        let mut outfile = fs::File::create(&final_output_path).map_err(|e| e.to_string())?;
        io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;

        extracted_files.push(final_output_path.to_string_lossy().to_string());
    }

    if extracted_files.is_empty() {
        return Err("No image files found in zip archive".to_string());
    }

    Ok(extracted_files)
}
