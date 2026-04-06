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
    menu::{Menu, MenuItem, Submenu},
    tray::TrayIconBuilder,
    Emitter, Manager, WebviewWindow, WindowEvent,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

/// 根据当前模式设置窗口的大小和位置
/// center 模式: 500x160, 屏幕居中
/// sidebar 模式: 360x屏幕高度, 贴靠右侧
/// settings 模式: 600x500, 屏幕居中
pub fn apply_window_mode(window: &WebviewWindow, mode: &str) {
    match mode {
        "center" => {
            let _ = window.set_size(tauri::LogicalSize::new(500.0, 500.0));
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
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let state = app.state::<AppState>();
                        let mode = state.config.lock().unwrap().mode.clone();
                        if let Some(window) = app.get_webview_window("main") {
                            toggle_window(&window, &mode);
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
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
            commands::update_hotkey,
            commands::set_autostart,
            commands::update_theme,
        ])
        // 系统托盘和窗口事件在 setup 回调中初始化
        .setup(|app| {
            // --- 系统托盘 ---
            let show_item = MenuItem::with_id(app, "show", "显示/隐藏", true, None::<&str>)?;
            let mode_item = MenuItem::with_id(app, "mode", "切换模式", true, None::<&str>)?;

            // 主题子菜单
            let theme_dark = MenuItem::with_id(app, "theme_dark", "暗夜深色", true, None::<&str>)?;
            let theme_light = MenuItem::with_id(app, "theme_light", "明亮浅色", true, None::<&str>)?;
            let theme_amoled = MenuItem::with_id(app, "theme_amoled", "AMOLED 纯黑", true, None::<&str>)?;
            let theme_ocean = MenuItem::with_id(app, "theme_ocean", "深海蓝", true, None::<&str>)?;
            let theme_forest = MenuItem::with_id(app, "theme_forest", "森林绿", true, None::<&str>)?;
            let theme_sunset = MenuItem::with_id(app, "theme_sunset", "日落暖橙", true, None::<&str>)?;
            let theme_sakura = MenuItem::with_id(app, "theme_sakura", "樱花粉", true, None::<&str>)?;
            let theme_cyberpunk = MenuItem::with_id(app, "theme_cyberpunk", "赛博朋克", true, None::<&str>)?;

            let theme_menu = Submenu::with_items(
                app,
                "切换主题",
                true,
                &[&theme_dark, &theme_light, &theme_amoled, &theme_ocean,
                  &theme_forest, &theme_sunset, &theme_sakura, &theme_cyberpunk],
            )?;

            let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[&show_item, &mode_item, &theme_menu, &settings_item, &quit_item],
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
                        "theme_dark" | "theme_light" | "theme_amoled" | "theme_ocean"
                        | "theme_forest" | "theme_sunset" | "theme_sakura" | "theme_cyberpunk" => {
                            // 提取主题名称
                            let theme = event.id.as_ref().strip_prefix("theme_").unwrap();
                            let mut config = state.config.lock().unwrap();
                            config.theme = theme.to_string();
                            let _ = crate::config::save_config(&config);
                            // 通知前端更新主题
                            let _ = window.emit("theme_changed", theme);
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

            // --- 全局快捷键 ---
            // 从配置读取快捷键并注册
            {
                let state = app.state::<AppState>();
                let config = state.config.lock().unwrap();
                if let Ok(shortcut) = config.hotkey.parse::<Shortcut>() {
                    let _ = app.global_shortcut().register(shortcut);
                }
            }

            // --- 开机自启 ---
            // 根据配置启用/禁用自启
            {
                let state = app.state::<AppState>();
                let config = state.config.lock().unwrap();
                let autostart = app.autolaunch();
                if config.autostart {
                    let _ = autostart.enable();
                } else {
                    let _ = autostart.disable();
                }
            }

            // --- WebView 背景透明 ---
            // Windows 上 WebView2 默认背景不透明，需要显式设置 alpha=0
            if let Some(window) = app.get_webview_window("main") {
                use tauri::utils::config::Color;
                let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
            }

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
