use tauri::State;
use crate::stores::history::HistoryState;
use crate::types::{HistoryItem, HistoryListOpts, Result};

#[tauri::command]
pub fn history_list(
    state: State<HistoryState>,
    opts: Option<HistoryListOpts>,
) -> Vec<HistoryItem> {
    let store = state.0.lock().unwrap();
    store.list(opts)
}

#[tauri::command]
pub fn history_delete(state: State<HistoryState>, id: i64) -> Result<()> {
    let mut store = state.0.lock().unwrap();
    store.delete(id);
    Result::ok(())
}

#[tauri::command]
pub fn history_clear(state: State<HistoryState>) -> Result<()> {
    let mut store = state.0.lock().unwrap();
    store.clear();
    Result::ok(())
}
