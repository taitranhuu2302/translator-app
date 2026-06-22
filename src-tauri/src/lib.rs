mod commands;
mod services;
mod stores;
mod types;

use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use stores::history::HistoryStore;
use stores::settings::SettingsStore;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_handler(move |app, shortcut, event| {
                if event.state != ShortcutState::Pressed {
                    return;
                }
                let settings_state = app.state::<stores::settings::SettingsState>();
                let settings = settings_state.0.lock().unwrap().get();

                let shortcut_key = (shortcut.mods.bits(), shortcut.key as u32);

                let check = |acc: &str| {
                    if let Ok((mods, code)) = services::shortcuts::electron_to_code_modifiers(acc) {
                        (mods.map(|m| m.bits()).unwrap_or(0), code as u32) == shortcut_key
                    } else {
                        false
                    }
                };

                if check(&settings.toggle_app_shortcut) {
                    if let Some(window) = app.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                } else if check(&settings.quick_translate_shortcut) {
                    let h = app.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = commands::quick::quick_translate_now(h).await;
                    });
                } else if check(&settings.quick_translate_replace_shortcut) {
                    let h = app.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = commands::quick::quick_translate_replace(h).await;
                    });
                } else if check(&settings.voice_text_shortcut) {
                    let h = app.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = commands::voice::voice_text_pipeline(h).await;
                    });
                }
            })
            .build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
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
            let settings_state = app.state::<stores::settings::SettingsState>();
            let settings = settings_state.0.lock().unwrap().get();
            for acc in [
                &settings.toggle_app_shortcut,
                &settings.quick_translate_shortcut,
                &settings.quick_translate_replace_shortcut,
                &settings.voice_text_shortcut,
            ] {
                if !acc.is_empty() {
                    let _ = services::shortcuts::register_shortcut(app.handle(), acc);
                }
            }

            // System tray (Windows/Linux only)
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
                let show_item = MenuItemBuilder::with_id("show", "Show/Hide").build(app)?;
                let translate_item = MenuItemBuilder::with_id("translate", "Quick Translate").build(app)?;
                let settings_item = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
                let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

                let menu = MenuBuilder::new(app)
                    .item(&show_item)
                    .item(&translate_item)
                    .item(&settings_item)
                    .separator()
                    .item(&quit_item)
                    .build()?;

                TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .on_menu_event(move |app, event| {
                        match event.id().as_ref() {
                            "show" => {
                                if let Some(w) = app.get_webview_window("main") {
                                    if w.is_visible().unwrap_or(false) {
                                        let _ = w.hide();
                                    } else {
                                        let _ = w.show();
                                        let _ = w.set_focus();
                                    }
                                }
                            }
                            "translate" => {
                                let h = app.clone();
                                tauri::async_runtime::spawn(async move {
                                    let _ = commands::quick::quick_translate_now(h).await;
                                });
                            }
                            "settings" => {
                                if let Some(w) = app.get_webview_window("main") {
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                }
                                let _ = app.emit("app:navigate", "/settings");
                            }
                            "quit" => app.exit(0),
                            _ => {}
                        }
                    })
                    .build(app)?;
            }

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
            commands::quick::quick_translate_now,
            commands::quick::quick_translate_replace,
            commands::quick::quick_retranslate,
            commands::voice::voice_text_pipeline,
            commands::macos::macos_request_quick_permissions,
            commands::macos::macos_open_privacy_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
