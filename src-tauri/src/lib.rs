//! QuickNote 应用入口
//! - 初始化配置和笔记数据
//! - 配置系统托盘 (右键菜单: 显示/隐藏、切换模式、设置、退出)
//! - 管理窗口行为 (失焦自动隐藏)
//! - 注册所有 IPC 命令

mod commands;
mod config;
mod note;

use commands::AppState;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WebviewWindow, WindowEvent,
};

/// 根据当前模式设置窗口的大小和位置
/// center 模式: 500x160, 屏幕居中
/// sidebar 模式: 360x屏幕高度, 贴靠右侧
/// settings 模式: 600x500, 屏幕居中
pub fn apply_window_mode(window: &WebviewWindow, mode: &str) {
    match mode {
        "center" => {
            let _ = window.set_size(tauri::LogicalSize::new(500.0, 160.0));
            let _ = window.center();
            let _ = window.set_resizable(false);
        }
        "sidebar" => {
            // 获取当前显示器尺寸，将窗口贴靠右侧
            if let Ok(Some(monitor)) = window.current_monitor() {
                let screen = monitor.size();
                let scale = monitor.scale_factor();
                let screen_w = screen.width as f64 / scale;
                let screen_h = screen.height as f64 / scale;
                let panel_w = 360.0;
                let _ = window.set_size(tauri::LogicalSize::new(panel_w, screen_h));
                let _ = window.set_position(tauri::LogicalPosition::new(
                    screen_w - panel_w,
                    0.0,
                ));
            }
            let _ = window.set_resizable(false);
        }
        "settings" => {
            let _ = window.set_size(tauri::LogicalSize::new(600.0, 500.0));
            let _ = window.center();
            let _ = window.set_resizable(false);
        }
        _ => {}
    }
}

/// 切换窗口显示/隐藏
fn toggle_window(window: &WebviewWindow, mode: &str) {
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        apply_window_mode(window, mode);
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_config = config::load_config();
    let notes_dir = std::path::PathBuf::from(&app_config.notes_dir);
    let notes = note::load_all_notes(&notes_dir);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            notes: Mutex::new(notes),
            config: Mutex::new(app_config),
            prevent_hide: Mutex::new(false),
        })
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
        // 系统托盘和窗口事件在 setup 回调中初始化
        .setup(|app| {
            // --- 系统托盘 ---
            let show_item = MenuItem::with_id(app, "show", "显示/隐藏", true, None::<&str>)?;
            let mode_item = MenuItem::with_id(app, "mode", "切换模式", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[&show_item, &mode_item, &settings_item, &quit_item],
            )?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    let state = app.state::<AppState>();
                    let window = app.get_webview_window("main").unwrap();
                    match event.id.as_ref() {
                        "show" => {
                            let mode = state.config.lock().unwrap().mode.clone();
                            toggle_window(&window, &mode);
                        }
                        "mode" => {
                            // 在 center 和 sidebar 之间切换
                            let mut config = state.config.lock().unwrap();
                            config.mode = if config.mode == "center" {
                                "sidebar".into()
                            } else {
                                "center".into()
                            };
                            let _ = crate::config::save_config(&config);
                            // 如果窗口正在显示，立即应用新模式
                            if window.is_visible().unwrap_or(false) {
                                apply_window_mode(&window, &config.mode);
                            }
                        }
                        "settings" => {
                            // 打开设置视图
                            *state.prevent_hide.lock().unwrap() = true;
                            apply_window_mode(&window, "settings");
                            let _ = window.show();
                            let _ = window.set_focus();
                            // 通知前端切换到设置视图
                            let _ = window.emit("navigate", "settings");
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        // 窗口失焦时自动隐藏 (设置页面除外)
        .on_window_event(|window, event| {
            if let WindowEvent::Focused(false) = event {
                let state = window.state::<AppState>();
                let prevent = *state.prevent_hide.lock().unwrap();
                if !prevent {
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
