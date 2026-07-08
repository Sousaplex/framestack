use crate::types::{ImageSequenceInfo, RenderProgress, RenderResult, VideoFormat};
use regex::Regex;
use std::path::Path;
use std::process::Stdio;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

pub struct FFmpegState {
    pub path_cache: Mutex<Option<String>>,
}

impl FFmpegState {
    pub fn new() -> Self {
        Self {
            path_cache: Mutex::new(None),
        }
    }
}

pub fn clear_path_cache(state: &FFmpegState) {
    let mut cache = state.path_cache.lock().unwrap();
    *cache = None;
}

pub fn find_ffmpeg_path(app: &AppHandle, custom_path: Option<&str>) -> Result<String, String> {
    // Check custom path first
    if let Some(path) = custom_path {
        if is_valid_ffmpeg(path) {
            return Ok(path.to_string());
        }
    }

    // Check cache
    {
        let state = app.state::<FFmpegState>();
        let cache = state.path_cache.lock().unwrap();
        if let Some(path) = cache.clone() {
            if is_valid_ffmpeg(&path) {
                return Ok(path);
            }
        }
    }

    // Try system PATH
    let candidates = if cfg!(target_os = "windows") {
        vec![
            "ffmpeg.exe".to_string(),
            r"C:\ffmpeg\bin\ffmpeg.exe".to_string(),
        ]
    } else {
        vec![
            "ffmpeg".to_string(),
            "/opt/homebrew/bin/ffmpeg".to_string(),
            "/usr/local/bin/ffmpeg".to_string(),
            "/usr/bin/ffmpeg".to_string(),
        ]
    };

    // Try which/where first
    let found = if cfg!(target_os = "windows") {
        run_command("where", &["ffmpeg"]).ok()
    } else {
        run_command("which", &["ffmpeg"]).ok()
    };

    if let Some(path) = found {
        let path = path.lines().next().unwrap_or("").trim().to_string();
        if !path.is_empty() && is_valid_ffmpeg(&path) {
            cache_path(app, path.clone());
            return Ok(path);
        }
    }

    for path in candidates {
        if is_valid_ffmpeg(&path) {
            cache_path(app, path.clone());
            return Ok(path);
        }
    }

    Err("FFmpeg not found. Please install FFmpeg or specify a custom path.".to_string())
}

pub fn find_ffprobe_path(ffmpeg_path: &str) -> String {
    let ffmpeg_path = Path::new(ffmpeg_path);
    if let Some(parent) = ffmpeg_path.parent() {
        let ffprobe_name = if cfg!(target_os = "windows") {
            "ffprobe.exe"
        } else {
            "ffprobe"
        };
        let ffprobe = parent.join(ffprobe_name);
        if ffprobe.exists() {
            return ffprobe.to_string_lossy().to_string();
        }
    }

    // Fallback to bare ffprobe
    if cfg!(target_os = "windows") {
        "ffprobe.exe".to_string()
    } else {
        "ffprobe".to_string()
    }
}

fn is_valid_ffmpeg(path: &str) -> bool {
    run_command(path, &["-version"]).is_ok()
}

fn run_command(cmd: &str, args: &[&str]) -> Result<String, String> {
    let output = std::process::Command::new(cmd)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to execute {}: {}", cmd, e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn cache_path(app: &AppHandle, path: String) {
    let state = app.state::<FFmpegState>();
    let mut cache = state.path_cache.lock().unwrap();
    *cache = Some(path);
}

pub fn build_ffmpeg_args(
    sequence_info: &ImageSequenceInfo,
    output_path: &str,
    format: &VideoFormat,
) -> Vec<String> {
    let input_pattern = Path::new(&sequence_info.directory)
        .join(&sequence_info.pattern)
        .to_string_lossy()
        .to_string();

    let mut args = vec![
        "-y".to_string(),
        "-framerate".to_string(),
        "24".to_string(),
        "-start_number".to_string(),
        sequence_info.first_frame.to_string(),
        "-i".to_string(),
        input_pattern,
    ];

    match format.id.as_str() {
        "dnxhd" => {
            args.extend([
                "-c:v".to_string(),
                "dnxhd".to_string(),
                "-b:v".to_string(),
                "220M".to_string(),
                "-pix_fmt".to_string(),
                "yuv422p".to_string(),
            ]);
        }
        "dnxhr" => {
            args.extend([
                "-c:v".to_string(),
                "dnxhd".to_string(),
                "-profile:v".to_string(),
                "dnxhr_hqx".to_string(),
                "-pix_fmt".to_string(),
                "yuv422p".to_string(),
            ]);
        }
        "prores4444" => {
            let pix_fmt = if sequence_info.has_alpha {
                "yuva444p10le"
            } else {
                "yuv444p10le"
            };
            args.extend([
                "-c:v".to_string(),
                "prores_ks".to_string(),
                "-profile:v".to_string(),
                "4444".to_string(),
                "-pix_fmt".to_string(),
                pix_fmt.to_string(),
            ]);
        }
        "prores422" => {
            args.extend([
                "-c:v".to_string(),
                "prores_ks".to_string(),
                "-profile:v".to_string(),
                "422".to_string(),
                "-pix_fmt".to_string(),
                "yuv422p10le".to_string(),
            ]);
        }
        "h264" => {
            args.extend([
                "-c:v".to_string(),
                "libx264".to_string(),
                "-preset".to_string(),
                "slow".to_string(),
                "-crf".to_string(),
                "18".to_string(),
                "-pix_fmt".to_string(),
                "yuv420p".to_string(),
            ]);
        }
        "h265" => {
            args.extend([
                "-c:v".to_string(),
                "libx265".to_string(),
                "-preset".to_string(),
                "slow".to_string(),
                "-crf".to_string(),
                "18".to_string(),
                "-pix_fmt".to_string(),
                "yuv420p".to_string(),
            ]);
        }
        "cineform" => {
            args.extend([
                "-c:v".to_string(),
                "cfhd".to_string(),
                "-quality".to_string(),
                "4".to_string(),
                "-pix_fmt".to_string(),
                "yuv422p".to_string(),
            ]);
        }
        "av1" => {
            args.extend([
                "-c:v".to_string(),
                "libaom-av1".to_string(),
                "-crf".to_string(),
                "30".to_string(),
                "-pix_fmt".to_string(),
                "yuv420p".to_string(),
            ]);
        }
        _ => {}
    }

    args.push(output_path.to_string());
    args
}

pub async fn render_sequence(
    app: &AppHandle,
    job_id: String,
    sequence_info: ImageSequenceInfo,
    output_path: String,
    format: VideoFormat,
) -> Result<RenderResult, String> {
    let ffmpeg_path = find_ffmpeg_path(app, None)?;
    let args = build_ffmpeg_args(&sequence_info, &output_path, &format);

    log::info!(
        "[Render {}] Starting render with FFmpeg: {}",
        job_id,
        ffmpeg_path
    );
    log::info!("[Render {}] Args: {:?}", job_id, args);

    let mut child = Command::new(&ffmpeg_path)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start FFmpeg: {}", e))?;

    // Store process reference for cancellation
    {
        let state = app.state::<crate::AppState>();
        let mut current = state.current_render.lock().unwrap();
        *current = Some(child.id().map(|id| id as u32).unwrap_or(0));
    }

    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;
    let reader = BufReader::new(stderr);
    let mut lines = reader.lines();

    let window = app.get_webview_window("main").ok_or("Main window not found")?;
    let total_frames = sequence_info.frame_count;
    let start_time = std::time::Instant::now();
    let frame_regex = Regex::new(r"frame=\s*(\d+)").unwrap();
    let fps_regex = Regex::new(r"fps=\s*([\d.]+)").unwrap();
    let mut last_logged_frame = 0;

    // Read stderr lines and emit progress
    while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
        if let Some(frame_match) = frame_regex.captures(&line) {
            let current_frame: i64 = frame_match[1].parse().unwrap_or(0);
            let fps: f64 = fps_regex
                .captures(&line)
                .and_then(|c| c[1].parse().ok())
                .unwrap_or(0.0);
            let percentage = ((current_frame as f64 / total_frames as f64) * 100.0).min(100.0);
            let eta = if fps > 0.0 && current_frame > 0 {
                Some((total_frames as i64 - current_frame) as f64 / fps)
            } else {
                None
            };

            let progress = RenderProgress {
                current_frame,
                total_frames,
                percentage,
                fps,
                eta,
                error: None,
            };

            if current_frame - last_logged_frame >= 10 {
                let elapsed = start_time.elapsed().as_secs_f64();
                log::info!(
                    "[Render {}] Progress: {:.1}% | Frame {}/{} | FPS: {:.1} | Elapsed: {:.1}s",
                    job_id,
                    percentage,
                    current_frame,
                    total_frames,
                    fps,
                    elapsed
                );
                last_logged_frame = current_frame;
            }

            let _ = window.emit(
                "render-progress",
                (&job_id, &progress),
            );
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait for FFmpeg: {}", e))?;

    // Clear render reference
    {
        let state = app.state::<crate::AppState>();
        let mut current = state.current_render.lock().unwrap();
        *current = None;
    }

    if status.success() {
        let progress = RenderProgress {
            current_frame: total_frames as i64,
            total_frames,
            percentage: 100.0,
            fps: 0.0,
            eta: Some(0.0),
            error: None,
        };
        let _ = window.emit("render-progress", (&job_id, &progress));
        Ok(RenderResult {
            success: true,
            job_id,
        })
    } else {
        let code = status.code().unwrap_or(-1);
        let error_msg = if code == 254 {
            "FFmpeg could not find input files. This may happen if:\n- Files were moved or deleted\n- Sequence pattern doesn't match all files\n- Multiple zip files weren't properly merged\n\nTry re-selecting all zip files at once, or ensure all files are in the same directory.".to_string()
        } else {
            format!("FFmpeg exited with code {}", code)
        };
        let _ = window.emit(
            "render-progress",
            (
                &job_id,
                RenderProgress {
                    current_frame: 0,
                    total_frames,
                    percentage: 0.0,
                    fps: 0.0,
                    eta: None,
                    error: Some(error_msg.clone()),
                },
            ),
        );
        Err(error_msg)
    }
}

pub async fn cancel_render(app: &AppHandle) -> Result<bool, String> {
    let state = app.state::<crate::AppState>();
    let pid = {
        let current = state.current_render.lock().unwrap();
        *current
    };

    if let Some(pid) = pid {
        #[cfg(unix)]
        {
            unsafe {
                libc::kill(pid as i32, libc::SIGTERM);
            }
        }
        #[cfg(windows)]
        {
            let _ = std::process::Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .output();
        }
        let mut current = state.current_render.lock().unwrap();
        *current = None;
        Ok(true)
    } else {
        Ok(false)
    }
}
