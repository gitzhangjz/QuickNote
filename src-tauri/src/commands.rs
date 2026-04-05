//! Tauri IPC 命令 —— 前端通过 invoke() 调用这些函数
//!
//! 所有命令通过 AppState 访问共享数据 (notes + config)
//! 命令返回 Result<T, String> 格式，错误信息直接传给前端

use crate::config::{self, AppConfig};
use crate::note::{self, Note};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};

/// 应用共享状态，通过 Tauri State 管理
/// 锁获取顺序: config → notes (所有代码路径必须遵守此顺序以避免死锁)
pub struct AppState {
    /// 内存中的笔记列表缓存
    pub notes: Mutex<Vec<Note>>,
    /// 当前应用配置
    pub config: Mutex<AppConfig>,
    /// 是否阻止窗口自动隐藏 (设置页面打开时为 true)
    pub prevent_hide: Mutex<bool>,
}

/// 获取笔记存储目录的 PathBuf
fn notes_dir(config: &AppConfig) -> PathBuf {
    PathBuf::from(&config.notes_dir)
}

/// 获取所有笔记 (从内存缓存读取)
#[tauri::command]
pub fn get_all_notes(state: State<'_, AppState>) -> Vec<Note> {
    state.notes.lock().unwrap().clone()
}

/// 创建新笔记
/// content: 笔记正文, tags: 标签列表, pinned: 是否置顶
#[tauri::command]
pub fn create_note(
    state: State<'_, AppState>,
    content: String,
    tags: Vec<String>,
    pinned: bool,
) -> Result<Note, String> {
    let config = state.config.lock().unwrap();
    let dir = notes_dir(&config);

    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    let note = Note {
        id: note::generate_id(),
        created: now,
        tags,
        pinned,
        content,
    };

    note::save_note(&dir, &note)?;

    // 更新内存缓存
    let mut notes = state.notes.lock().unwrap();
    notes.insert(0, note.clone()); // 最新的插入到最前
    Ok(note)
}

/// 更新已有笔记
#[tauri::command]
pub fn update_note(
    state: State<'_, AppState>,
    id: String,
    content: String,
    tags: Vec<String>,
    pinned: bool,
) -> Result<Note, String> {
    let config = state.config.lock().unwrap();
    let dir = notes_dir(&config);

    let mut notes = state.notes.lock().unwrap();
    let note = notes
        .iter_mut()
        .find(|n| n.id == id)
        .ok_or_else(|| format!("未找到 ID 为 {} 的笔记", id))?;

    note.content = content;
    note.tags = tags;
    note.pinned = pinned;
    let updated = note.clone();

    note::save_note(&dir, &updated)?;
    Ok(updated)
}

/// 删除笔记
#[tauri::command]
pub fn delete_note_cmd(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let config = state.config.lock().unwrap();
    let dir = notes_dir(&config);

    note::delete_note(&dir, &id)?;

    // 从缓存中移除
    let mut notes = state.notes.lock().unwrap();
    notes.retain(|n| n.id != id);
    Ok(())
}

/// 获取当前配置
#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> AppConfig {
    state.config.lock().unwrap().clone()
}

/// 更新配置 (全量替换)
#[tauri::command]
pub fn update_config(
    state: State<'_, AppState>,
    new_config: AppConfig,
) -> Result<(), String> {
    config::save_config(&new_config)?;
    let mut config = state.config.lock().unwrap();
    *config = new_config;
    Ok(())
}

/// 切换窗口自动隐藏 (设置页面使用)
#[tauri::command]
pub fn set_prevent_hide(state: State<'_, AppState>, prevent: bool) {
    *state.prevent_hide.lock().unwrap() = prevent;
}

/// 前端请求切换窗口模式 (设置页返回时调用)
#[tauri::command]
pub fn apply_mode(app_handle: tauri::AppHandle, mode: String) {
    if let Some(window) = app_handle.get_webview_window("main") {
        crate::apply_window_mode(&window, &mode);
    }
}

/// 更新全局快捷键 —— 注销旧键，注册新键，保存配置
#[tauri::command]
pub fn update_hotkey(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    hotkey: String,
) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

    let mut config = state.config.lock().unwrap();

    // 注销旧快捷键
    if let Ok(old_shortcut) = config.hotkey.parse::<Shortcut>() {
        let _ = app_handle.global_shortcut().unregister(old_shortcut);
    }

    // 注册新快捷键
    let new_shortcut: Shortcut = hotkey
        .parse()
        .map_err(|e| format!("无效的快捷键格式: {e}"))?;
    app_handle
        .global_shortcut()
        .register(new_shortcut)
        .map_err(|e| format!("注册快捷键失败: {e}"))?;

    config.hotkey = hotkey;
    let config_clone = config.clone();
    drop(config); // 释放锁再写文件
    crate::config::save_config(&config_clone)
}

/// 设置开机自启状态
#[tauri::command]
pub fn set_autostart(app_handle: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let autostart = app_handle.autolaunch();
    if enabled {
        autostart.enable().map_err(|e| format!("{e}"))?;
    } else {
        autostart.disable().map_err(|e| format!("{e}"))?;
    }
    Ok(())
}
