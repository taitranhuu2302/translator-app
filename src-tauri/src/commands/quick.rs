use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use crate::services::{ai, permissions, selection::{capture, clipboard as clip_snap, native_input}, translation::google};
use crate::services::translation;
use crate::stores::settings::SettingsState;
use crate::types::{QuickTranslatePayload, Result, TranslationRequest};

#[tauri::command]
pub async fn quick_translate_now(app: AppHandle) -> Result<()> {
    let settings = app.state::<SettingsState>().0.lock().unwrap().get();

    if let Some(w) = app.get_webview_window("quick") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        }
    }

    if let Err(e) = permissions::ensure_quick_translate_permissions().await {
        let _ = app.emit("quick:error", &e);
        return Result::err(crate::types::AppErrorCode::SelectionCaptureFailed, e);
    }

    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false) {
            let _ = w.hide();
        }
    }

    tokio::time::sleep(std::time::Duration::from_millis(220)).await;

    let text = match capture::capture_selected_text(
        &app,
        settings.auto_copy_delay_ms as u64,
        settings.restore_clipboard,
    )
    .await
    {
        Ok(t) => t,
        Err(e) => {
            let _ = app.emit("quick:error", &e);
            if let Some(w) = app.get_webview_window("quick") {
                let _ = w.show();
            }
            return Result::err(crate::types::AppErrorCode::SelectionCaptureFailed, e);
        }
    };

    let request = TranslationRequest {
        source: "auto".into(),
        target: settings.quick_target_language.clone(),
        text,
    };

    let translation = if translation::should_use_google_translate(&request.text) {
        google::translate(&request).await
    } else {
        ai::run_ai_translate(request, settings, true).await
    };

    match translation {
        Ok(result) => {
            let payload = QuickTranslatePayload {
                original: result.source_text,
                translated: result.translation,
                source: result.source,
                target: result.target,
            };
            let _ = app.emit("quick:show", &payload);
            if let Some(w) = app.get_webview_window("quick") {
                let _ = w.show();
                let _ = w.set_focus();
            }
            Result::ok(())
        }
        Err(e) => {
            let _ = app.emit("quick:error", &e);
            if let Some(w) = app.get_webview_window("quick") {
                let _ = w.show();
            }
            Result::err(crate::types::AppErrorCode::ApiError, e)
        }
    }
}

#[tauri::command]
pub async fn quick_translate_replace(app: AppHandle) -> Result<()> {
    let settings = app.state::<SettingsState>().0.lock().unwrap().get();

    if let Err(e) = permissions::ensure_quick_translate_permissions().await {
        return Result::err(crate::types::AppErrorCode::SelectionCaptureFailed, e);
    }

    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false) {
            let _ = w.hide();
        }
    }

    tokio::time::sleep(std::time::Duration::from_millis(220)).await;

    let selected_text = match capture::capture_selected_text(
        &app,
        settings.auto_copy_delay_ms as u64,
        false,
    )
    .await
    {
        Ok(t) => t,
        Err(e) => return Result::err(crate::types::AppErrorCode::SelectionCaptureFailed, e),
    };

    let request = TranslationRequest {
        source: "auto".into(),
        target: settings.quick_replace_target_language.clone(),
        text: selected_text,
    };

    let translated = if translation::should_use_google_translate(&request.text) {
        match google::translate(&request).await {
            Ok(r) => r.translation,
            Err(e) => return Result::err(crate::types::AppErrorCode::ApiError, e),
        }
    } else {
        match ai::run_ai_translate(request, settings.clone(), true).await {
            Ok(r) => r.translation,
            Err(e) => return Result::err(crate::types::AppErrorCode::ApiError, e),
        }
    };

    let snap = clip_snap::snapshot(&app);
    if let Err(e) = app.clipboard().write_text(&translated) {
        if settings.restore_clipboard {
            clip_snap::restore(&app, &snap);
        }
        return Result::err(
            crate::types::AppErrorCode::ClipboardRestoreFailed,
            format!("CLIPBOARD_RESTORE_FAILED: {}", e),
        );
    }

    tokio::time::sleep(std::time::Duration::from_millis(80)).await;
    let _ = native_input::simulate_paste_shortcut().await;
    tokio::time::sleep(std::time::Duration::from_millis(120)).await;

    if settings.restore_clipboard {
        clip_snap::restore(&app, &snap);
    }

    Result::ok(())
}

#[tauri::command]
pub async fn quick_retranslate(
    app: AppHandle,
    request: TranslationRequest,
) -> Result<crate::types::TranslationResult> {
    let settings = app.state::<SettingsState>().0.lock().unwrap().get();
    match ai::run_ai_translate(request, settings, true).await {
        Ok(data) => Result::ok(data),
        Err(e) => Result::err(crate::types::AppErrorCode::ApiError, e),
    }
}
