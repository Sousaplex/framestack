use crate::ffmpeg::{
    cancel_render, find_ffmpeg_path, find_ffprobe_path, render_sequence, FFmpegState,
};
use crate::sequence::{detect_sequence_info, find_image_files_in_directory, get_unique_temp_dir};
use crate::store::JobStore;
use crate::types::{
    DirectoryInfo, ExtractionProgress, FFmpegCheckResult, ImageSequenceInfo, RenderJob,
    RenderResult, SetFFmpegPathResult, VideoFormat, ZipInput, ZipSelectResult,
};
use crate::zip_extract::extract_zip_file;
use crate::AppState;
use rfd::FileDialog;
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager};

#[tauri::command]
pub async fn select_image_sequence() -> Result<Option<Vec<String>>, String> {
    let files = FileDialog::new()
        .add_filter("Images", &["png", "jpg", "jpeg", "tiff", "tif", "exr", "dpx"])
        .add_filter("All Files", &["*"])
        .pick_files();

    Ok(files.map(|paths| paths.into_iter().map(|p| p.to_string_lossy().to_string()).collect()))
}

#[tauri::command]
pub async fn select_sequence_folder() -> Result<Option<String>, String> {
    let folder = FileDialog::new().pick_folder();
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn select_zip_file(allow_multiple: bool) -> Result<Option<ZipSelectResult>, String> {
    let dialog = FileDialog::new()
        .add_filter("Zip Files", &["zip"])
        .add_filter("All Files", &["*"]);

    if allow_multiple {
        let files = dialog.pick_files();
        Ok(files.map(|paths| {
            ZipSelectResult::Multiple(
                paths.into_iter().map(|p| p.to_string_lossy().to_string()).collect(),
            )
        }))
    } else {
        let file = dialog.pick_file();
        Ok(file.map(|p| ZipSelectResult::Single(p.to_string_lossy().to_string())))
    }
}

#[tauri::command]
pub async fn extract_and_detect_zip(
    app: AppHandle,
    zip_path: ZipInput,
    existing_temp_dir: Option<String>,
) -> Result<Vec<String>, String> {
    let zip_paths = zip_path.into_vec();
    let temp_dir = existing_temp_dir
        .map(|d| Path::new(&d).to_path_buf())
        .unwrap_or_else(get_unique_temp_dir);

    tokio::fs::create_dir_all(&temp_dir)
        .await
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;

    let mut all_files = Vec::new();

    for (i, zip_path) in zip_paths.iter().enumerate() {
        let files = extract_zip_file(
            &app,
            zip_path,
            &temp_dir,
            i,
            zip_paths.len(),
            all_files.len(),
        )?;
        all_files.extend(files);
    }

    if all_files.is_empty() {
        return Err("No image files found in zip archive(s)".to_string());
    }

    // Send final progress
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit(
            "extraction-progress",
            &ExtractionProgress {
                current_file: all_files.len(),
                total_files: all_files.len(),
                percentage: 100.0,
                current_file_name: String::new(),
            },
        );
    }

    Ok(all_files)
}

#[tauri::command]
pub async fn detect_sequence_from_folder(folder_path: String) -> Result<Vec<String>, String> {
    let files = find_image_files_in_directory(&folder_path).await?;
    if files.is_empty() {
        return Err("No image files found in folder".to_string());
    }
    Ok(files)
}

#[tauri::command]
pub async fn process_dropped_files(
    app: AppHandle,
    file_paths: Vec<String>,
    existing_temp_dir: Option<String>,
) -> Result<Vec<String>, String> {
    if file_paths.is_empty() {
        return Err("No files provided".to_string());
    }

    let all_zips = file_paths
        .iter()
        .all(|p| p.to_lowercase().ends_with(".zip"));
    let zip_files: Vec<String> = file_paths
        .iter()
        .filter(|p| p.to_lowercase().ends_with(".zip"))
        .cloned()
        .collect();

    if all_zips && !zip_files.is_empty() {
        let temp_dir = existing_temp_dir
            .map(|d| Path::new(&d).to_path_buf())
            .unwrap_or_else(get_unique_temp_dir);

        tokio::fs::create_dir_all(&temp_dir)
            .await
            .map_err(|e| e.to_string())?;

        let mut all_files = Vec::new();
        for (i, zip_path) in zip_files.iter().enumerate() {
            let files = extract_zip_file(
                &app,
                zip_path,
                &temp_dir,
                i,
                zip_files.len(),
                all_files.len(),
            )?;
            all_files.extend(files);
        }

        if all_files.is_empty() {
            return Err("No image files found in zip archive(s)".to_string());
        }

        Ok(all_files)
    } else {
        let first_path = &file_paths[0];
        let metadata = tokio::fs::metadata(first_path).await;

        if let Ok(meta) = metadata {
            if meta.is_dir() {
                let files = find_image_files_in_directory(first_path).await?;
                if files.is_empty() {
                    return Err("No image files found in folder".to_string());
                }
                return Ok(files);
            }
        }

        // Filter to image files
        let image_files: Vec<String> = file_paths
            .into_iter()
            .filter(|p| {
                Path::new(p)
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|ext| {
                        let ext = ext.to_lowercase();
                        ["png", "jpg", "jpeg", "tiff", "tif", "exr", "dpx"].contains(&ext.as_str())
                    })
                    .unwrap_or(false)
            })
            .collect();

        Ok(image_files)
    }
}

#[tauri::command]
pub async fn select_output_directory() -> Result<Option<String>, String> {
    let folder = FileDialog::new().pick_folder();
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn select_output_file(default_path: String) -> Result<Option<String>, String> {
    let default_dir = Path::new(&default_path).parent().map(|p| p.to_path_buf());
    let default_name = Path::new(&default_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("output.mov");

    let mut dialog = FileDialog::new()
        .add_filter("Video Files", &["mov", "mp4", "mkv", "avi"])
        .add_filter("All Files", &["*"]);

    if let Some(dir) = default_dir {
        dialog = dialog.set_directory(dir);
    }
    dialog = dialog.set_file_name(default_name);

    let file = dialog.save_file();
    Ok(file.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn browse_directory(path: String) -> Result<DirectoryInfo, String> {
    let mut entries = tokio::fs::read_dir(&path)
        .await
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut files = Vec::new();
    let mut directories = Vec::new();

    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let name = entry.file_name().to_string_lossy().to_string();
        if entry.file_type().await.map_err(|e| e.to_string())?.is_dir() {
            directories.push(name);
        } else {
            files.push(name);
        }
    }

    files.sort();
    directories.sort();

    Ok(DirectoryInfo {
        path,
        files,
        directories,
    })
}

#[tauri::command]
pub async fn create_directory(parent_path: String, name: String) -> Result<String, String> {
    let new_path = Path::new(&parent_path).join(&name);
    tokio::fs::create_dir_all(&new_path)
        .await
        .map_err(|e| e.to_string())?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn detect_sequence_info_command(
    app: AppHandle,
    file_paths: Vec<String>,
) -> Result<ImageSequenceInfo, String> {
    let ffmpeg_path = find_ffmpeg_path(&app, None).unwrap_or_else(|_| "ffmpeg".to_string());
    let ffprobe_path = find_ffprobe_path(&ffmpeg_path);
    detect_sequence_info(file_paths, &ffprobe_path)
}

#[tauri::command]
pub async fn render_sequence_command(
    app: AppHandle,
    job_id: String,
    sequence_info: ImageSequenceInfo,
    output_path: String,
    format: VideoFormat,
) -> Result<RenderResult, String> {
    // Check for existing render
    {
        let state = app.state::<AppState>();
        let current = state.current_render.lock().unwrap();
        if current.is_some() {
            return Err("A render is already in progress".to_string());
        }
    }

    render_sequence(&app, job_id, sequence_info, output_path, format).await
}

#[tauri::command]
pub async fn cancel_render_command(app: AppHandle) -> Result<bool, String> {
    cancel_render(&app).await
}

#[tauri::command]
pub async fn get_job_history(app: AppHandle) -> Result<Vec<RenderJob>, String> {
    let store = app.state::<JobStore>();
    Ok(store.get_all_jobs())
}

#[tauri::command]
pub async fn save_job(app: AppHandle, job: RenderJob) -> Result<bool, String> {
    let store = app.state::<JobStore>();
    store.save_job(&job).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn clear_job_history(app: AppHandle) -> Result<bool, String> {
    let store = app.state::<JobStore>();
    store.clear_jobs().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn get_downloads_folder(app: AppHandle) -> Result<String, String> {
    app.path()
        .download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_preferred_output_folder(app: AppHandle) -> Result<String, String> {
    let store = app.state::<JobStore>();
    if let Some(folder) = store.get_default_output_folder() {
        return Ok(folder);
    }
    app.path()
        .download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_preferred_output_folder(app: AppHandle, folder: String) -> Result<bool, String> {
    let store = app.state::<JobStore>();
    store.set_default_output_folder(&folder).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn get_app_version(app: AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}

#[tauri::command]
pub async fn get_app_icon_path(app: AppHandle) -> Result<Option<String>, String> {
    let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    let icon_path = resource_dir.join("icon.png");

    if icon_path.exists() {
        let image = image::ImageReader::open(&icon_path)
            .map_err(|e| e.to_string())?
            .decode()
            .map_err(|e| e.to_string())?;
        let mut bytes: Vec<u8> = Vec::new();
        image
            .write_to(&mut std::io::Cursor::new(&mut bytes), image::ImageFormat::Png)
            .map_err(|e| e.to_string())?;
        let base64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes);
        Ok(Some(format!("data:image/png;base64,{}", base64)))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn check_ffmpeg(app: AppHandle) -> Result<FFmpegCheckResult, String> {
    let store = app.state::<JobStore>();
    let custom_path = store.get_ffmpeg_path();

    match find_ffmpeg_path(&app, custom_path.as_deref()) {
        Ok(path) => Ok(FFmpegCheckResult {
            available: true,
            path: Some(path),
            error: None,
        }),
        Err(error) => Ok(FFmpegCheckResult {
            available: false,
            error: Some(error),
            path: None,
        }),
    }
}

#[tauri::command]
pub async fn get_ffmpeg_path(app: AppHandle) -> Result<Option<String>, String> {
    let store = app.state::<JobStore>();
    Ok(store.get_ffmpeg_path())
}

#[tauri::command]
pub async fn set_ffmpeg_path(
    app: AppHandle,
    path: String,
) -> Result<SetFFmpegPathResult, String> {
    if find_ffmpeg_path(&app, Some(&path)).is_ok() {
        let store = app.state::<JobStore>();
        store.set_ffmpeg_path(&path).map_err(|e| e.to_string())?;
        let state = app.state::<FFmpegState>();
        crate::ffmpeg::clear_path_cache(&state);
        Ok(SetFFmpegPathResult {
            success: true,
            error: None,
        })
    } else {
        Ok(SetFFmpegPathResult {
            success: false,
            error: Some("Invalid FFmpeg path".to_string()),
        })
    }
}

#[tauri::command]
pub async fn browse_ffmpeg_path() -> Result<Option<String>, String> {
    let filter = if cfg!(target_os = "windows") {
        &["exe"][..]
    } else {
        &["*"][..]
    };

    let file = FileDialog::new()
        .set_title("Select FFmpeg Executable")
        .add_filter("Executable", filter)
        .add_filter("All Files", &["*"])
        .pick_file();

    Ok(file.map(|p| p.to_string_lossy().to_string()))
}
