pub mod commands;
pub mod ffmpeg;
pub mod sequence;
pub mod store;
pub mod types;
pub mod zip_extract;

use crate::ffmpeg::FFmpegState;
use crate::store::JobStore;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub current_render: Mutex<Option<u32>>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            current_render: Mutex::new(None),
        })
        .manage(FFmpegState::new())
        .setup(|app| {
            let job_store = JobStore::new(app.handle())?;
            app.manage(job_store);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::select_image_sequence,
            commands::select_sequence_folder,
            commands::select_zip_file,
            commands::extract_and_detect_zip,
            commands::detect_sequence_from_folder,
            commands::process_dropped_files,
            commands::select_output_directory,
            commands::select_output_file,
            commands::browse_directory,
            commands::create_directory,
            commands::detect_sequence_info_command,
            commands::render_sequence_command,
            commands::cancel_render_command,
            commands::get_job_history,
            commands::save_job,
            commands::clear_job_history,
            commands::get_downloads_folder,
            commands::get_preferred_output_folder,
            commands::set_preferred_output_folder,
            commands::get_app_version,
            commands::get_app_icon_path,
            commands::check_ffmpeg,
            commands::get_ffmpeg_path,
            commands::set_ffmpeg_path,
            commands::browse_ffmpeg_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
