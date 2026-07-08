use crate::types::ImageSequenceInfo;
use regex::Regex;
use std::path::{Path, PathBuf};
use std::process::Stdio;

const IMAGE_EXTENSIONS: &[&str] = &[".png", ".jpg", ".jpeg", ".tiff", ".tif", ".exr", ".dpx"];

pub fn is_image_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            let ext = ext.to_lowercase();
            IMAGE_EXTENSIONS.iter().any(|e| e.trim_start_matches('.') == ext)
        })
        .unwrap_or(false)
}

pub async fn find_image_files_in_directory(dir_path: &str) -> Result<Vec<String>, String> {
    let mut entries = tokio::fs::read_dir(dir_path)
        .await
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut image_files = Vec::new();

    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let path = entry.path();
        if path.is_file() && is_image_file(&path) {
            image_files.push(path.to_string_lossy().to_string());
        }
    }

    image_files.sort();
    Ok(image_files)
}

pub fn detect_sequence_info(file_paths: Vec<String>, ffprobe_path: &str) -> Result<ImageSequenceInfo, String> {
    if file_paths.is_empty() {
        return Err("No files provided".to_string());
    }

    let trailing_number_regex = Regex::new(r"(\d+)(?!.*\d)").unwrap();

    let mut sorted_files = file_paths.clone();
    sorted_files.sort_by(|a, b| {
        let a_name = Path::new(a).file_stem().unwrap_or_default().to_string_lossy();
        let b_name = Path::new(b).file_stem().unwrap_or_default().to_string_lossy();

        match (
            trailing_number_regex.captures(&a_name),
            trailing_number_regex.captures(&b_name),
        ) {
            (Some(a_match), Some(b_match)) => {
                let a_num: i64 = a_match[1].parse().unwrap_or(0);
                let b_num: i64 = b_match[1].parse().unwrap_or(0);
                a_num.cmp(&b_num)
            }
            _ => a_name.cmp(&b_name),
        }
    });

    let first_file = sorted_files.first().unwrap().clone();
    let last_file = sorted_files.last().unwrap().clone();
    let dir = Path::new(&first_file)
        .parent()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string();
    let ext = Path::new(&first_file)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let first_base = Path::new(&first_file)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let last_base = Path::new(&last_file)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let mut pattern = first_base.clone();
    let mut first_frame = 0i64;
    let mut last_frame = 0i64;

    if let (Some(first_match), Some(last_match)) = (
        trailing_number_regex.captures(&first_base),
        trailing_number_regex.captures(&last_base),
    ) {
        first_frame = first_match[1].parse().unwrap_or(0);
        last_frame = last_match[1].parse().unwrap_or(0);
        let padding = first_match[1].len();
        let pattern_str = format!("%0{}d", padding);
        pattern = first_base.replacen(&first_match[1], &pattern_str, 1);
    }

    // Try ffprobe for dimensions and real alpha detection
    let (width, height, has_alpha) = probe_image(&first_file, ffprobe_path)?;

    // If ffprobe couldn't detect alpha, fall back to extension-based detection
    let has_alpha = has_alpha
        || [".png", ".exr", ".tiff", ".tif"].contains(&format!(".{}", ext).as_str());

    Ok(ImageSequenceInfo {
        directory: dir,
        pattern,
        first_frame,
        last_frame,
        frame_count: sorted_files.len(),
        extension: format!(".{}", ext),
        width,
        height,
        has_alpha,
        files: sorted_files,
    })
}

fn probe_image(first_file: &str, ffprobe_path: &str) -> Result<(Option<u32>, Option<u32>, bool), String> {
    let output = std::process::Command::new(ffprobe_path)
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height,pix_fmt",
            "-of",
            "json",
            first_file,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();

    match output {
        Ok(output) if output.status.success() => {
            let text = String::from_utf8_lossy(&output.stdout);
            let parsed: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
            let stream = parsed
                .get("streams")
                .and_then(|s| s.as_array())
                .and_then(|arr| arr.first());

            let width = stream
                .and_then(|s| s.get("width"))
                .and_then(|v| v.as_u64())
                .map(|v| v as u32);
            let height = stream
                .and_then(|s| s.get("height"))
                .and_then(|v| v.as_u64())
                .map(|v| v as u32);
            let pix_fmt = stream
                .and_then(|s| s.get("pix_fmt"))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let has_alpha = pix_fmt.contains("a");
            Ok((width, height, has_alpha))
        }
        _ => {
            // Try image crate fallback for dimensions
            if let Ok((width, height)) = read_image_dimensions(first_file) {
                Ok((Some(width), Some(height), false))
            } else {
                Ok((None, None, false))
            }
        }
    }
}

fn read_image_dimensions(path: &str) -> Result<(u32, u32), String> {
    let reader = image::ImageReader::open(path).map_err(|e| e.to_string())?;
    let (width, height) = reader.into_dimensions().map_err(|e| e.to_string())?;
    Ok((width, height))
}

pub fn get_unique_temp_dir() -> PathBuf {
    let temp_dir = std::env::temp_dir();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    temp_dir.join("framestack-extract").join(now.to_string())
}
