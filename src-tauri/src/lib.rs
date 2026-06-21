mod commands;
mod services;
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
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            let settings_store = SettingsStore::new(app_data_dir.clone());
            let history_store = HistoryStore::new(app_data_dir);

            app.manage(stores::settings::SettingsState(Mutex::new(settings_store)));
            app.manage(stores::history::HistoryState(Mutex::new(history_store)));

            // Register global shortcuts from settings
            let handle = app.handle().clone();
            let is_macos = cfg!(target_os = "macos");
            let _ = services::shortcuts::register_default_shortcuts(&handle, is_macos);

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
            commands::translate::translate_manual,
            commands::improve::improve_run,
            commands::models::models_list_groq,
            commands::models::models_list_gemini,
            commands::window::app_open_settings,
            commands::window::app_open_full,
            commands::window::app_toggle,
            commands::window::quick_close,
            commands::shortcuts::shortcut_validate,
            commands::shortcuts::shortcut_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
