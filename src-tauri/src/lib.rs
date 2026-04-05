//! QuickNote 应用入口 —— 配置 Tauri 插件、注册命令、管理应用状态

mod commands;
mod config;
mod note;

use commands::AppState;
use std::sync::Mutex;

/// 根据模式设置窗口大小和位置
/// center: 500x160 居中, sidebar: 360x屏幕高度 靠右
pub fn apply_window_mode(window: &tauri::WebviewWindow, mode: &str) {
    match mode {
        "sidebar" => {
            if let Some(monitor) = window.current_monitor().ok().flatten() {
                let screen = monitor.size();
                let _ = window.set_size(tauri::LogicalSize::new(360.0, screen.height as f64));
                let _ = window.set_position(tauri::LogicalPosition::new(
                    screen.width as f64 - 360.0,
                    0.0,
                ));
            }
        }
        _ => {
            // 默认居中模式
            let _ = window.set_size(tauri::LogicalSize::new(500.0, 160.0));
            let _ = window.center();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 加载配置和笔记数据
    let app_config = config::load_config();
    let notes_dir = std::path::PathBuf::from(&app_config.notes_dir);
    let notes = note::load_all_notes(&notes_dir);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // 注入共享状态，所有 command 通过 State<AppState> 访问
        .manage(AppState {
            notes: Mutex::new(notes),
            config: Mutex::new(app_config),
            prevent_hide: Mutex::new(false),
        })
        // 注册所有 IPC 命令
        .invoke_handler(tauri::generate_handler![
            commands::get_all_notes,
            commands::create_note,
            commands::update_note,
            commands::delete_note_cmd,
            commands::get_config,
            commands::update_config,
            commands::set_prevent_hide,
            commands::apply_mode,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
