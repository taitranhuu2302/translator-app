use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::types::AppSettings;

pub struct SettingsStore {
    path: PathBuf,
    settings: AppSettings,
}

impl SettingsStore {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let path = app_data_dir.join("settings.json");
        let settings = Self::load_from_disk(&path).unwrap_or_else(|_| {
            let defaults = AppSettings::default();
            let _ = Self::save_to_disk(&path, &defaults);
            defaults
        });
        Self { path, settings }
    }

    fn load_from_disk(path: &PathBuf) -> Result<AppSettings, String> {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        let raw: serde_json::Value =
            serde_json::from_str(&content).map_err(|e| e.to_string())?;
        let defaults = serde_json::to_value(AppSettings::default())
            .map_err(|e| e.to_string())?;

        let merged = deep_merge(defaults, raw);
        let mut settings: AppSettings =
            serde_json::from_value(merged).map_err(|e| e.to_string())?;
        settings.version = 6;
        Ok(settings)
    }

    fn save_to_disk(path: &PathBuf, settings: &AppSettings) -> Result<(), String> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
        fs::write(path, json).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get(&self) -> AppSettings {
        self.settings.clone()
    }

    pub fn update(&mut self, patch: serde_json::Value) -> Result<AppSettings, String> {
        let current = serde_json::to_value(&self.settings).map_err(|e| e.to_string())?;
        let merged = deep_merge(current, patch);
        let new_settings: AppSettings =
            serde_json::from_value(merged).map_err(|e| e.to_string())?;
        Self::save_to_disk(&self.path, &new_settings)?;
        self.settings = new_settings.clone();
        Ok(new_settings)
    }

    pub fn reload(&mut self) {
        if let Ok(settings) = Self::load_from_disk(&self.path) {
            self.settings = settings;
        }
    }

    pub fn reset_shortcuts(&mut self) -> Result<AppSettings, String> {
        let mut s = self.settings.clone();
        s.quick_translate_shortcut = "CommandOrControl+Alt+Q".into();
        s.quick_translate_replace_shortcut = "CommandOrControl+Alt+R".into();
        s.toggle_app_shortcut = "CommandOrControl+Alt+E".into();
        s.voice_text_shortcut = "CommandOrControl+Alt+D".into();
        Self::save_to_disk(&self.path, &s)?;
        self.settings = s.clone();
        Ok(s)
    }
}

fn deep_merge(base: serde_json::Value, overlay: serde_json::Value) -> serde_json::Value {
    match (base, overlay) {
        (serde_json::Value::Object(mut base_map), serde_json::Value::Object(overlay_map)) => {
            for (key, overlay_val) in overlay_map {
                if let Some(base_val) = base_map.remove(&key) {
                    base_map.insert(key, deep_merge(base_val, overlay_val));
                } else {
                    base_map.insert(key, overlay_val);
                }
            }
            serde_json::Value::Object(base_map)
        }
        (_base, overlay) => overlay,
    }
}

pub struct SettingsState(pub Mutex<SettingsStore>);
