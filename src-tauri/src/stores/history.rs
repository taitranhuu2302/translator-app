use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::types::{HistoryData, HistoryItem, HistoryListOpts};

pub struct HistoryStore {
    path: PathBuf,
    data: HistoryData,
}

impl HistoryStore {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let path = app_data_dir.join("history.json");
        let data = Self::load_from_disk(&path).unwrap_or_else(|_| HistoryData {
            next_id: 1,
            items: Vec::new(),
        });
        Self { path, data }
    }

    fn load_from_disk(path: &PathBuf) -> Result<HistoryData, String> {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    }

    fn save_to_disk(&self) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json =
            serde_json::to_string_pretty(&self.data).map_err(|e| e.to_string())?;
        fs::write(&self.path, json).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list(&self, opts: Option<HistoryListOpts>) -> Vec<HistoryItem> {
        let opts = opts.unwrap_or(HistoryListOpts {
            limit: Some(200),
            filter_type: None,
        });
        let limit = opts.limit.unwrap_or(200) as usize;
        let mut items: Vec<HistoryItem> = self
            .data
            .items
            .iter()
            .filter(|item| {
                if let Some(ref t) = opts.filter_type {
                    item.item_type == *t
                } else {
                    true
                }
            })
            .cloned()
            .collect();
        items.truncate(limit);
        items
    }

    pub fn add(&mut self, item: HistoryItem, max_items: i32) {
        self.data.items.insert(0, item);
        self.data.next_id += 1;
        if max_items > 0 {
            self.data.items.truncate(max_items as usize);
        }
        let _ = self.save_to_disk();
    }

    pub fn delete(&mut self, id: i64) {
        self.data.items.retain(|item| item.id != id);
        let _ = self.save_to_disk();
    }

    pub fn clear(&mut self) {
        self.data.items.clear();
        let _ = self.save_to_disk();
    }
}

pub struct HistoryState(pub Mutex<HistoryStore>);
