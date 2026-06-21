mod commands;
mod stores;
mod types;

use std::sync::Mutex;
use tauri::Manager;

use stores::history::HistoryStore;
use stores::settings::SettingsStore;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            let settings_store = SettingsStore::new(app_data_dir.clone());
            let history_store = HistoryStore::new(app_data_dir);

            app.manage(stores::settings::SettingsState(Mutex::new(settings_store)));
            app.manage(stores::history::HistoryState(Mutex::new(history_store)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings::settings_get,
            commands::settings::settings_update,
            commands::settings::settings_reset_shortcuts,
            commands::history::history_list,
            commands::history::history_delete,
            commands::history::history_clear,
            commands::clipboard::clipboard_write,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
