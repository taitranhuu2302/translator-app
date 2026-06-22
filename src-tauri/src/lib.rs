mod commands;
mod services;
mod stores;
mod types;

use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;
use tauri_plugin_global_shortcut::ShortcutState;

use stores::history::HistoryStore;
use stores::settings::SettingsStore;
use stores::settings::SettingsState;
use services::shortcuts;

fn default_shortcuts() -> [(&'static str, &'static str); 4] {
    [
        ("toggleApp", "CommandOrControl+Alt+E"),
        ("quickTranslate", "CommandOrControl+Alt+Q"),
        ("quickTranslateReplace", "CommandOrControl+Alt+R"),
        ("voiceText", "CommandOrControl+Alt+D"),
    ]
}

pub fn run() {
    let shortcuts: Vec<tauri_plugin_global_shortcut::Shortcut> = default_shortcuts().iter()
        .filter_map(|(_role, accel)| shortcuts::electron_to_code_modifiers(accel).ok())
        .map(|(mods, code)| tauri_plugin_global_shortcut::Shortcut::new(mods, code))
        .collect();

    let gs_plugin = tauri_plugin_global_shortcut::Builder::new()
        .with_shortcuts(shortcuts)
        .expect("failed to register shortcuts")
        .with_handler(move |app, shortcut, event| {
            if event.state != ShortcutState::Pressed { return; }
            let s = app.state::<SettingsState>().0.lock().unwrap().get();
            let key = (shortcut.mods.bits(), shortcut.key as u32);
            let matches = |acc: &str| -> bool {
                shortcuts::electron_to_code_modifiers(acc).ok()
                    .map(|(m, c)| (m.map(|x| x.bits()).unwrap_or(0), c as u32) == key)
                    .unwrap_or(false)
            };
            if matches(&s.toggle_app_shortcut) {
                if let Some(w) = app.get_webview_window("main") {
                    if w.is_visible().unwrap_or(false) { let _ = w.hide(); }
                    else { let _ = w.show(); let _ = w.set_focus(); }
                }
            } else if matches(&s.quick_translate_shortcut) {
                tauri::async_runtime::spawn({ let h = app.clone(); async move { let _ = commands::quick::quick_translate_now(h).await; } });
            } else if matches(&s.quick_translate_replace_shortcut) {
                tauri::async_runtime::spawn({ let h = app.clone(); async move { let _ = commands::quick::quick_translate_replace(h).await; } });
            } else if matches(&s.voice_text_shortcut) {
                tauri::async_runtime::spawn({ let h = app.clone(); async move { let _ = commands::voice::voice_text_pipeline(h).await; } });
            }
        }).build();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(gs_plugin)
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("failed to resolve app data dir");
            let settings_store = SettingsStore::new(app_data_dir.clone());
            let history_store = HistoryStore::new(app_data_dir);
            app.manage(SettingsState(Mutex::new(settings_store)));
            app.manage(stores::history::HistoryState(Mutex::new(history_store)));

            // macOS: hide instead of close
            if cfg!(target_os = "macos") {
                if let Some(w) = app.get_webview_window("main") {
                    let handle = app.handle().clone();
                    w.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                            api.prevent_close();
                            let _ = handle.get_webview_window("main").map(|w| w.hide());
                        }
                    });
                }
            } else {
                let show = MenuItemBuilder::with_id("show", "Show/Hide").build(app)?;
                let tr = MenuItemBuilder::with_id("translate", "Quick Translate").build(app)?;
                let settings = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
                let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
                let menu = MenuBuilder::new(app).item(&show).item(&tr).item(&settings).separator().item(&quit).build()?;
                TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .on_menu_event(move |app, event| match event.id().as_ref() {
                        "show" => {
                            if let Some(w) = app.get_webview_window("main") {
                                if w.is_visible().unwrap_or(false) { let _ = w.hide(); }
                                else { let _ = w.show(); let _ = w.set_focus(); }
                            }
                        }
                        "translate" => { tauri::async_runtime::spawn({ let h = app.clone(); async move { let _ = commands::quick::quick_translate_now(h).await; } }); }
                        "settings" => { if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.set_focus(); } let _ = app.emit("app:navigate", "/settings"); }
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings::settings_get, commands::settings::settings_update, commands::settings::settings_reset_shortcuts,
            commands::history::history_list, commands::history::history_delete, commands::history::history_clear,
            commands::clipboard::clipboard_write,
            commands::translate::translate_manual, commands::improve::improve_run,
            commands::models::models_list_groq, commands::models::models_list_gemini,
            commands::window::app_open_settings, commands::window::app_open_full, commands::window::app_toggle, commands::window::quick_close,
            commands::shortcuts::shortcut_validate, commands::shortcuts::shortcut_update,
            commands::quick::quick_translate_now, commands::quick::quick_translate_replace, commands::quick::quick_retranslate,
            commands::voice::voice_text_pipeline,
            commands::macos::macos_request_quick_permissions, commands::macos::macos_open_privacy_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
