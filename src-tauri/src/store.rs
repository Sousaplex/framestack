use serde_json::json;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

use crate::types::RenderJob;

pub struct JobStore {
    path: PathBuf,
    cache: Mutex<serde_json::Value>,
}

impl JobStore {
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
        let path = data_dir.join("framestack-store.json");

        let initial = if path.exists() {
            let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            serde_json::from_str(&contents).unwrap_or_else(|_| default_store())
        } else {
            default_store()
        };

        Ok(Self {
            path,
            cache: Mutex::new(initial),
        })
    }

    fn save(&self) -> Result<(), String> {
        let cache = self.cache.lock().map_err(|e| e.to_string())?;
        let contents = serde_json::to_string_pretty(&*cache).map_err(|e| e.to_string())?;
        fs::write(&self.path, contents).map_err(|e| e.to_string())
    }

    pub fn get_preferences(&self) -> serde_json::Value {
        let cache = self.cache.lock().unwrap_or_else(|e| e.into_inner());
        cache
            .get("preferences")
            .cloned()
            .unwrap_or_else(|| json!({}))
    }

    pub fn set_default_output_folder(&self, folder: &str) -> Result<(), String> {
        {
            let mut cache = self.cache.lock().map_err(|e| e.to_string())?;
            let prefs = cache
                .as_object_mut()
                .unwrap()
                .entry("preferences")
                .or_insert_with(|| json!({}))
                .as_object_mut()
                .unwrap();
            prefs.insert("defaultOutputFolder".to_string(), json!(folder));
        }
        self.save()
    }

    pub fn set_ffmpeg_path(&self, path: &str) -> Result<(), String> {
        {
            let mut cache = self.cache.lock().map_err(|e| e.to_string())?;
            let prefs = cache
                .as_object_mut()
                .unwrap()
                .entry("preferences")
                .or_insert_with(|| json!({}))
                .as_object_mut()
                .unwrap();
            prefs.insert("ffmpegPath".to_string(), json!(path));
        }
        self.save()
    }

    pub fn get_ffmpeg_path(&self) -> Option<String> {
        self.get_preferences()
            .get("ffmpegPath")
            .and_then(|v| v.as_str().map(String::from))
    }

    pub fn get_default_output_folder(&self) -> Option<String> {
        self.get_preferences()
            .get("defaultOutputFolder")
            .and_then(|v| v.as_str().map(String::from))
    }

    pub fn save_job(&self, job: &RenderJob) -> Result<(), String> {
        {
            let mut cache = self.cache.lock().map_err(|e| e.to_string())?;
            let jobs = cache
                .as_object_mut()
                .unwrap()
                .entry("jobs")
                .or_insert_with(|| json!([]))
                .as_array_mut()
                .unwrap();

            let mut jobs_vec: Vec<RenderJob> = jobs
                .iter()
                .filter_map(|j| serde_json::from_value(j.clone()).ok())
                .collect();

            if let Some(idx) = jobs_vec.iter().position(|j| j.id == job.id) {
                jobs_vec[idx] = job.clone();
            } else {
                jobs_vec.push(job.clone());
            }

            jobs_vec.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
            jobs_vec.truncate(50);

            *jobs = jobs_vec.into_iter().map(|j| json!(j)).collect();
        }
        self.save()
    }

    pub fn get_all_jobs(&self) -> Vec<RenderJob> {
        let cache = self.cache.lock().unwrap_or_else(|e| e.into_inner());
        cache
            .get("jobs")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default()
    }

    pub fn clear_jobs(&self) -> Result<(), String> {
        {
            let mut cache = self.cache.lock().map_err(|e| e.to_string())?;
            cache
                .as_object_mut()
                .unwrap()
                .insert("jobs".to_string(), json!([]));
        }
        self.save()
    }
}

fn default_store() -> serde_json::Value {
    json!({
        "jobs": [],
        "preferences": {}
    })
}
