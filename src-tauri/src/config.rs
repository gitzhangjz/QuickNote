//! 应用配置管理 —— 读写 config.json，提供默认值
//!
//! 配置文件位于 ~/QuickNote/config.json
//! 首次启动时自动创建默认配置

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// 应用配置，对应 config.json 的字段
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AppConfig {
    /// 全局快捷键，如 "Alt+Space"
    pub hotkey: String,
    /// 呼出模式: "center" 居中输入框, "sidebar" 侧边栏
    pub mode: String,
    /// 主题: "dark" 暗色, "light" 亮色
    pub theme: String,
    /// 是否开机自启
    pub autostart: bool,
    /// 笔记存储目录路径
    #[serde(rename = "notesDir")]
    pub notes_dir: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        let default_notes_dir = dirs::home_dir()
            .unwrap_or_default()
            .join("QuickNote")
            .join("notes")
            .to_string_lossy()
            .to_string();

        Self {
            hotkey: "Alt+Space".into(),
            mode: "center".into(),
            theme: "dark".into(),
            autostart: true,
            notes_dir: default_notes_dir,
        }
    }
}

/// 获取配置文件路径: ~/QuickNote/config.json
pub fn config_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join("QuickNote")
        .join("config.json")
}

/// 从磁盘加载配置，文件不存在时返回默认配置并写入磁盘
pub fn load_config() -> AppConfig {
    let path = config_path();
    match fs::read_to_string(&path) {
        Ok(raw) => {
            // 解析成功则返回，失败则返回默认配置
            serde_json::from_str(&raw).unwrap_or_default()
        }
        Err(_) => {
            // 文件不存在，创建默认配置并写入磁盘
            let config = AppConfig::default();
            let _ = save_config(&config);
            config
        }
    }
}

/// 将配置保存到磁盘
pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let path = config_path();
    // 确保父目录存在
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建配置目录失败: {e}"))?;
    }
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("序列化配置失败: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("写入配置失败: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    // 辅助函数: 在临时目录中测试配置读写
    fn test_config_path(dir: &std::path::Path) -> PathBuf {
        dir.join("config.json")
    }

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert_eq!(config.hotkey, "Alt+Space");
        assert_eq!(config.mode, "center");
        assert_eq!(config.theme, "dark");
        assert_eq!(config.autostart, true);
        assert!(config.notes_dir.contains("QuickNote"));
    }

    #[test]
    fn test_config_serialize_deserialize() {
        let config = AppConfig::default();
        let json = serde_json::to_string_pretty(&config).unwrap();
        let parsed: AppConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(config, parsed);
    }

    #[test]
    fn test_save_and_load_config() {
        let dir = TempDir::new().unwrap();
        let path = test_config_path(dir.path());

        let config = AppConfig {
            hotkey: "Ctrl+Space".into(),
            mode: "sidebar".into(),
            theme: "light".into(),
            autostart: false,
            notes_dir: "/tmp/notes".into(),
        };

        // 保存
        let json = serde_json::to_string_pretty(&config).unwrap();
        fs::write(&path, &json).unwrap();

        // 加载
        let raw = fs::read_to_string(&path).unwrap();
        let loaded: AppConfig = serde_json::from_str(&raw).unwrap();
        assert_eq!(config, loaded);
    }
}
