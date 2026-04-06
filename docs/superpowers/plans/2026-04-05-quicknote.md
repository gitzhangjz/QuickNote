# QuickNote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight Windows memo app with global hotkey, system tray, dual UI modes (center overlay / sidebar), and local Markdown file storage.

**Architecture:** Tauri v2 single-window app. Rust backend handles file I/O, global shortcut, tray, window management. Solid.js frontend renders center/sidebar/settings views. Notes stored as Markdown files with YAML-like frontmatter. Config in JSON.

**Tech Stack:** Tauri v2, Solid.js, Vite, TypeScript, Rust

---

## File Structure

```
src-tauri/
  Cargo.toml                       # Rust dependencies
  tauri.conf.json                  # Tauri window/tray/bundle config
  build.rs                         # Tauri build script
  capabilities/
    default.json                   # Plugin permissions
  src/
    main.rs                        # Desktop entry point (generated)
    lib.rs                         # App builder: tray, shortcuts, window mgmt, setup
    note.rs                        # Note struct, frontmatter parse/write, file I/O
    config.rs                      # AppConfig struct, load/save config.json
    commands.rs                    # All #[tauri::command] IPC handlers

src/
  index.html                       # HTML entry (transparent background)
  index.tsx                        # Solid.js mount point
  App.tsx                          # Root component: mode routing
  notes-store.ts                   # Notes state + IPC wrappers
  config-store.ts                  # Config state + IPC wrappers
  CenterMode.tsx                   # Center overlay input component
  Sidebar.tsx                      # Sidebar panel component
  NoteItem.tsx                     # Single note card in sidebar list
  Settings.tsx                     # Settings panel component
  styles.css                       # All styles, CSS variables for themes
```

---

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` (via scaffold)
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`
- Create: `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`
- Create: `src/index.tsx`, `src/App.tsx`, `src/styles.css`
- Create: `.gitignore`

- [ ] **Step 1: Scaffold Tauri v2 + Solid.js project**

Run from the **parent directory** of QuickNote (e.g., `D:\`):

```bash
npm create tauri-app@latest QuickNote -- --template solid-ts --manager npm
```

If `D:\QuickNote` already has files, scaffold to a temp name and merge:

```bash
npm create tauri-app@latest quicknote-temp -- --template solid-ts --manager npm
# Copy all files from quicknote-temp/ into D:\QuickNote/, preserving existing docs/
# Delete quicknote-temp/
```

- [ ] **Step 2: Install additional npm dependencies**

```bash
cd D:/QuickNote
npm install @tauri-apps/plugin-global-shortcut @tauri-apps/plugin-autostart
```

- [ ] **Step 3: Update Cargo.toml dependencies**

Replace the `[dependencies]` section in `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-png"] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rand = "0.8"
chrono = { version = "0.4", features = ["serde"] }
dirs = "5"

[target.'cfg(desktop)'.dependencies]
tauri-plugin-global-shortcut = "2"
tauri-plugin-autostart = "2"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

- [ ] **Step 4: Configure tauri.conf.json**

Replace `src-tauri/tauri.conf.json` with:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "QuickNote",
  "version": "0.1.0",
  "identifier": "com.quicknote.app",
  "build": {
    "devUrl": "http://localhost:1420",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": false,
    "windows": [
      {
        "label": "main",
        "title": "QuickNote",
        "width": 500,
        "height": 160,
        "visible": false,
        "transparent": true,
        "decorations": false,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "resizable": false,
        "center": true
      }
    ],
    "trayIcon": {
      "id": "main-tray",
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    },
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "wix": {
        "language": "zh-CN"
      }
    }
  }
}
```

- [ ] **Step 5: Set up capabilities/permissions**

Replace `src-tauri/capabilities/default.json` with:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "main-capability",
  "description": "Main window permissions",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-set-position",
    "core:window:allow-set-size",
    "core:window:allow-set-focus",
    "core:window:allow-center",
    "core:window:allow-is-visible",
    "core:event:default",
    "core:tray:default",
    "core:menu:default",
    "global-shortcut:default",
    "autostart:default"
  ]
}
```

- [ ] **Step 6: Set up minimal frontend files**

Replace `src/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QuickNote</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

Replace `src/index.tsx`:

```tsx
/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";

// 挂载 Solid.js 应用到 DOM
render(() => <App />, document.getElementById("root")!);
```

Replace `src/App.tsx`:

```tsx
/**
 * 根组件 —— 后续根据模式切换 CenterMode / Sidebar / Settings 视图
 * 当前为占位，验证项目能正常运行
 */
export default function App() {
  return <div class="app">QuickNote is running</div>;
}
```

Create `src/styles.css`:

```css
/* ===== 全局基础样式 ===== */
/* 背景透明，让 Tauri 透明窗口生效 */
html, body {
  margin: 0;
  padding: 0;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
  color: #e0e0e0;
  overflow: hidden;
  user-select: none;
}

#root {
  width: 100vw;
  height: 100vh;
}
```

- [ ] **Step 7: Update lib.rs to minimal Tauri setup**

Replace `src-tauri/src/lib.rs`:

```rust
//! QuickNote 应用入口 —— 配置 Tauri 插件和窗口行为

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 8: Add .gitignore and initialize git**

Create `.gitignore` in project root:

```
node_modules/
dist/
src-tauri/target/
.superpowers/
```

```bash
cd D:/QuickNote
git init
git add .
git commit -m "feat: scaffold Tauri v2 + Solid.js project"
```

- [ ] **Step 9: Verify the project builds and runs**

```bash
cd D:/QuickNote
npm run tauri dev
```

Expected: A transparent window appears (may be invisible since background is transparent and content is minimal). The dev server compiles without errors. Close the window to continue.

---

### Task 2: Note Data Model & File I/O (Rust)

**Files:**
- Create: `src-tauri/src/note.rs`
- Modify: `src-tauri/src/lib.rs` (add `mod note;`)

- [ ] **Step 1: Write failing tests for Note struct and frontmatter parsing**

Create `src-tauri/src/note.rs`:

```rust
//! 笔记数据模型 —— 结构体定义、frontmatter 解析/序列化、文件读写
//!
//! 每条笔记是一个 Markdown 文件，格式为:
//!   ---
//!   id: abc123
//!   created: 2026-04-05T14:30:52
//!   tags: [工作, 灵感]
//!   pinned: true
//!   ---
//!   正文内容

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// 单条笔记的完整数据
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Note {
    pub id: String,
    pub created: String,
    pub tags: Vec<String>,
    pub pinned: bool,
    pub content: String,
}

/// 从 Markdown 文件内容解析出 Note 结构
/// 文件格式: YAML-like frontmatter (--- 分隔) + 正文
pub fn parse_note(raw: &str) -> Option<Note> {
    todo!()
}

/// 将 Note 序列化为 Markdown 文件内容 (frontmatter + 正文)
pub fn serialize_note(note: &Note) -> String {
    todo!()
}

/// 生成 6 位随机 ID (小写字母 + 数字)
pub fn generate_id() -> String {
    todo!()
}

/// 根据 Note 生成文件名: {日期}_{时间}_{ID}.md
/// 例如: 2026-04-05_143052_a1b2c3.md
pub fn note_filename(note: &Note) -> String {
    todo!()
}

/// 从指定目录加载所有笔记文件
pub fn load_all_notes(dir: &Path) -> Vec<Note> {
    todo!()
}

/// 将单条笔记写入指定目录
pub fn save_note(dir: &Path, note: &Note) -> Result<(), String> {
    todo!()
}

/// 从指定目录删除一条笔记 (按 ID 查找文件)
pub fn delete_note(dir: &Path, id: &str) -> Result<(), String> {
    todo!()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_note_basic() {
        let raw = "---\nid: abc123\ncreated: 2026-04-05T14:30:52\ntags: [工作, 灵感]\npinned: true\n---\n这是正文内容";
        let note = parse_note(raw).unwrap();
        assert_eq!(note.id, "abc123");
        assert_eq!(note.created, "2026-04-05T14:30:52");
        assert_eq!(note.tags, vec!["工作", "灵感"]);
        assert_eq!(note.pinned, true);
        assert_eq!(note.content, "这是正文内容");
    }

    #[test]
    fn test_parse_note_empty_tags() {
        let raw = "---\nid: xyz789\ncreated: 2026-04-05T15:00:00\ntags: []\npinned: false\n---\n没有标签的笔记";
        let note = parse_note(raw).unwrap();
        assert!(note.tags.is_empty());
        assert_eq!(note.pinned, false);
    }

    #[test]
    fn test_parse_note_no_frontmatter() {
        let raw = "没有 frontmatter 的纯文本";
        assert!(parse_note(raw).is_none());
    }

    #[test]
    fn test_serialize_note() {
        let note = Note {
            id: "abc123".into(),
            created: "2026-04-05T14:30:52".into(),
            tags: vec!["工作".into(), "灵感".into()],
            pinned: true,
            content: "测试内容".into(),
        };
        let result = serialize_note(&note);
        assert!(result.contains("id: abc123"));
        assert!(result.contains("tags: [工作, 灵感]"));
        assert!(result.contains("pinned: true"));
        assert!(result.contains("测试内容"));
    }

    #[test]
    fn test_generate_id_length_and_charset() {
        let id = generate_id();
        assert_eq!(id.len(), 6);
        assert!(id.chars().all(|c| c.is_ascii_alphanumeric()));
    }

    #[test]
    fn test_note_filename_format() {
        let note = Note {
            id: "abc123".into(),
            created: "2026-04-05T14:30:52".into(),
            tags: vec![],
            pinned: false,
            content: "test".into(),
        };
        let filename = note_filename(&note);
        assert_eq!(filename, "2026-04-05_143052_abc123.md");
    }

    #[test]
    fn test_roundtrip_serialize_parse() {
        let note = Note {
            id: "roundt".into(),
            created: "2026-01-01T00:00:00".into(),
            tags: vec!["test".into()],
            pinned: false,
            content: "roundtrip test".into(),
        };
        let serialized = serialize_note(&note);
        let parsed = parse_note(&serialized).unwrap();
        assert_eq!(note, parsed);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd D:/QuickNote/src-tauri
cargo test --lib note::tests
```

Expected: All 7 tests FAIL with `not yet implemented` panics.

- [ ] **Step 3: Implement all functions in note.rs**

Replace the `todo!()` bodies with:

```rust
pub fn parse_note(raw: &str) -> Option<Note> {
    // 按 "---" 分割: ["", frontmatter, body]
    let parts: Vec<&str> = raw.splitn(3, "---").collect();
    if parts.len() < 3 {
        return None;
    }

    let yaml_block = parts[1].trim();
    let content = parts[2].trim().to_string();

    let mut id = String::new();
    let mut created = String::new();
    let mut tags: Vec<String> = Vec::new();
    let mut pinned = false;

    // 逐行解析 frontmatter 的 key: value 对
    for line in yaml_block.lines() {
        let line = line.trim();
        if let Some((key, value)) = line.split_once(": ") {
            match key {
                "id" => id = value.to_string(),
                "created" => created = value.to_string(),
                "tags" => {
                    // 解析 [tag1, tag2] 格式
                    let inner = value.trim_start_matches('[').trim_end_matches(']').trim();
                    if !inner.is_empty() {
                        tags = inner.split(", ").map(|s| s.trim().to_string()).collect();
                    }
                }
                "pinned" => pinned = value == "true",
                _ => {}
            }
        }
    }

    Some(Note { id, created, tags, pinned, content })
}

pub fn serialize_note(note: &Note) -> String {
    let tags_str = if note.tags.is_empty() {
        "[]".to_string()
    } else {
        format!("[{}]", note.tags.join(", "))
    };

    format!(
        "---\nid: {}\ncreated: {}\ntags: {}\npinned: {}\n---\n{}",
        note.id, note.created, tags_str, note.pinned, note.content
    )
}

pub fn generate_id() -> String {
    use rand::Rng;
    let charset = b"abcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::thread_rng();
    (0..6)
        .map(|_| charset[rng.gen_range(0..charset.len())] as char)
        .collect()
}

pub fn note_filename(note: &Note) -> String {
    // 从 ISO 时间戳 "2026-04-05T14:30:52" 提取日期和时间部分
    let date_part = &note.created[..10]; // "2026-04-05"
    let time_part = note.created[11..19].replace(':', ""); // "143052"
    format!("{}_{}__{}.md", date_part, time_part, note.id)
}

pub fn load_all_notes(dir: &Path) -> Vec<Note> {
    let mut notes = Vec::new();
    // 目录不存在时返回空列表
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return notes,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "md") {
            if let Ok(raw) = fs::read_to_string(&path) {
                if let Some(note) = parse_note(&raw) {
                    notes.push(note);
                }
            }
        }
    }
    // 按创建时间倒序排列
    notes.sort_by(|a, b| b.created.cmp(&a.created));
    notes
}

pub fn save_note(dir: &Path, note: &Note) -> Result<(), String> {
    // 确保目录存在
    fs::create_dir_all(dir).map_err(|e| format!("创建目录失败: {e}"))?;

    // 先删除该 ID 的旧文件 (如果是更新操作)
    let _ = delete_note(dir, &note.id);

    let filename = note_filename(note);
    let filepath = dir.join(filename);
    let content = serialize_note(note);
    fs::write(&filepath, content).map_err(|e| format!("写入文件失败: {e}"))
}

pub fn delete_note(dir: &Path, id: &str) -> Result<(), String> {
    // 遍历目录找到包含该 ID 的文件并删除
    let entries = fs::read_dir(dir).map_err(|e| format!("读取目录失败: {e}"))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.contains(id) && name.ends_with(".md") {
                fs::remove_file(&path).map_err(|e| format!("删除文件失败: {e}"))?;
                return Ok(());
            }
        }
    }
    Err(format!("未找到 ID 为 {} 的笔记文件", id))
}
```

- [ ] **Step 4: Fix note_filename to match test expectation**

The test expects `2026-04-05_143052_abc123.md` but the implementation produces `2026-04-05_143052__abc123.md` (double underscore). Fix `note_filename`:

```rust
pub fn note_filename(note: &Note) -> String {
    let date_part = &note.created[..10];
    let time_part = note.created[11..19].replace(':', "");
    format!("{}_{}_{}.md", date_part, time_part, note.id)
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd D:/QuickNote/src-tauri
cargo test --lib note::tests
```

Expected: All 7 tests PASS.

- [ ] **Step 6: Add module declaration to lib.rs**

Add at the top of `src-tauri/src/lib.rs`:

```rust
mod note;
```

- [ ] **Step 7: Commit**

```bash
cd D:/QuickNote
git add src-tauri/src/note.rs src-tauri/src/lib.rs
git commit -m "feat: add Note data model with frontmatter parsing and file I/O"
```

---

### Task 3: Config Management (Rust)

**Files:**
- Create: `src-tauri/src/config.rs`
- Modify: `src-tauri/src/lib.rs` (add `mod config;`)

- [ ] **Step 1: Write failing tests for AppConfig**

Create `src-tauri/src/config.rs`:

```rust
//! 应用配置管理 —— 读写 config.json，提供默认值
//!
//! 配置文件位于 ~/QuickNote/config.json
//! 首次启动时自动创建默认配置

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

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
    todo!()
}

/// 将配置保存到磁盘
pub fn save_config(config: &AppConfig) -> Result<(), String> {
    todo!()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    // 辅助函数: 在临时目录中测试配置读写
    fn test_config_path(dir: &Path) -> PathBuf {
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
```

- [ ] **Step 2: Add tempfile dev-dependency to Cargo.toml**

Add to `src-tauri/Cargo.toml`:

```toml
[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 3: Run tests to verify the passing ones pass and todo! ones fail**

```bash
cd D:/QuickNote/src-tauri
cargo test --lib config::tests
```

Expected: `test_default_config` and `test_config_serialize_deserialize` and `test_save_and_load_config` PASS (they don't call `todo!()` functions). The `load_config` and `save_config` functions are not tested directly yet.

- [ ] **Step 4: Implement load_config and save_config**

Replace the `todo!()` bodies:

```rust
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
```

- [ ] **Step 5: Run all tests**

```bash
cd D:/QuickNote/src-tauri
cargo test --lib config::tests
```

Expected: All 3 tests PASS.

- [ ] **Step 6: Add module declaration to lib.rs**

Add to `src-tauri/src/lib.rs`:

```rust
mod config;
```

- [ ] **Step 7: Commit**

```bash
cd D:/QuickNote
git add src-tauri/src/config.rs src-tauri/src/lib.rs src-tauri/Cargo.toml
git commit -m "feat: add AppConfig with load/save and default values"
```

---

### Task 4: Tauri Commands (Rust)

**Files:**
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs` (register commands, add AppState)

- [ ] **Step 1: Create commands.rs with all IPC handlers**

Create `src-tauri/src/commands.rs`:

```rust
//! Tauri IPC 命令 —— 前端通过 invoke() 调用这些函数
//!
//! 所有命令通过 AppState 访问共享数据 (notes + config)
//! 命令返回 Result<T, String> 格式，错误信息直接传给前端

use crate::config::{self, AppConfig};
use crate::note::{self, Note};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

/// 应用共享状态，通过 Tauri State 管理
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
    #[serde(rename = "newConfig")] new_config: AppConfig,
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
```

- [ ] **Step 2: Update lib.rs to register commands and manage state**

Replace `src-tauri/src/lib.rs`:

```rust
//! QuickNote 应用入口 —— 配置 Tauri 插件、注册命令、管理应用状态

mod commands;
mod config;
mod note;

use commands::AppState;
use std::sync::Mutex;

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
```

- [ ] **Step 3: Verify compilation**

```bash
cd D:/QuickNote/src-tauri
cargo build
```

Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
cd D:/QuickNote
git add src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat: add Tauri IPC commands for notes CRUD and config"
```

---

### Task 5: System Tray & Window Management (Rust)

**Files:**
- Modify: `src-tauri/src/lib.rs` (add tray setup, window management, blur handler)

- [ ] **Step 1: Add tray and window management to lib.rs**

Replace `src-tauri/src/lib.rs`:

```rust
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
    Manager, WebviewWindow, WindowEvent,
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
                .menu_on_left_click(false)
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
```

- [ ] **Step 2: Verify compilation**

```bash
cd D:/QuickNote/src-tauri
cargo build
```

Expected: Compiles without errors.

- [ ] **Step 3: Run dev mode and test tray icon**

```bash
cd D:/QuickNote
npm run tauri dev
```

Expected: App starts with a tray icon in the system tray. Right-click shows menu (显示/隐藏, 切换模式, 设置, 退出). "退出" closes the app.

- [ ] **Step 4: Commit**

```bash
cd D:/QuickNote
git add src-tauri/src/lib.rs
git commit -m "feat: add system tray menu and window management"
```

---

### Task 6: Global Shortcut & Autostart (Rust)

**Files:**
- Modify: `src-tauri/src/lib.rs` (add shortcut registration and autostart)
- Modify: `src-tauri/src/commands.rs` (add update_hotkey command)

- [ ] **Step 1: Add global shortcut and autostart plugins to lib.rs setup**

In `src-tauri/src/lib.rs`, add these imports at the top:

```rust
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
```

Then, inside the `.setup(|app| { ... })` block, **after** the tray setup code and **before** `Ok(())`, add:

```rust
            // --- 全局快捷键 ---
            // 注册快捷键插件，handler 处理所有注册的快捷键事件
            app.handle().plugin(
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
            )?;

            // 从配置读取快捷键并注册
            {
                let config = app.state::<AppState>().config.lock().unwrap();
                if let Ok(shortcut) = config.hotkey.parse::<Shortcut>() {
                    let _ = app.global_shortcut().register(shortcut);
                }
            }

            // --- 开机自启 ---
            app.handle().plugin(tauri_plugin_autostart::init(
                MacosLauncher::LaunchAgent,
                None,
            ))?;

            // 根据配置启用/禁用自启
            {
                let config = app.state::<AppState>().config.lock().unwrap();
                let autostart = app.autolaunch();
                if config.autostart {
                    let _ = autostart.enable();
                } else {
                    let _ = autostart.disable();
                }
            }
```

- [ ] **Step 2: Add update_hotkey command to commands.rs**

Add this command to `src-tauri/src/commands.rs`:

```rust
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
```

- [ ] **Step 3: Register new commands in lib.rs invoke_handler**

Add to the `generate_handler!` macro in `lib.rs`:

```rust
            commands::update_hotkey,
            commands::set_autostart,
```

- [ ] **Step 4: Verify compilation and test hotkey**

```bash
cd D:/QuickNote
npm run tauri dev
```

Expected: App starts, registers Alt+Space globally. Pressing Alt+Space shows the window. Pressing again hides it. Check the tray icon also works.

- [ ] **Step 5: Commit**

```bash
cd D:/QuickNote
git add src-tauri/src/lib.rs src-tauri/src/commands.rs
git commit -m "feat: add global shortcut registration and autostart"
```

---

### Task 7: Frontend Stores & IPC Layer

**Files:**
- Create: `src/notes-store.ts`
- Create: `src/config-store.ts`

- [ ] **Step 1: Create notes store**

Create `src/notes-store.ts`:

```typescript
/**
 * 笔记状态管理 —— Solid.js 信号 + Tauri IPC 调用
 *
 * 所有笔记数据在前端内存中维护，通过 IPC 与 Rust 后端同步
 * 搜索/筛选在前端完成 (createMemo 自动响应状态变化)
 */

import { createSignal, createMemo } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

/** 笔记数据结构 (与 Rust 端 Note 结构对应) */
export interface Note {
  id: string;
  created: string;
  tags: string[];
  pinned: boolean;
  content: string;
}

// --- 响应式状态 ---
const [notes, setNotes] = createSignal<Note[]>([]);
const [searchQuery, setSearchQuery] = createSignal("");
const [activeTag, setActiveTag] = createSignal<string | null>(null);
const [showPinnedOnly, setShowPinnedOnly] = createSignal(false);

// --- 计算属性: 根据搜索/标签/置顶条件过滤笔记 ---
export const filteredNotes = createMemo(() => {
  let result = notes();

  // 搜索过滤: 大小写不敏感的内容匹配
  const query = searchQuery().toLowerCase();
  if (query) {
    result = result.filter((n) => n.content.toLowerCase().includes(query));
  }

  // 标签过滤
  const tag = activeTag();
  if (tag) {
    result = result.filter((n) => n.tags.includes(tag));
  }

  // 仅显示收藏
  if (showPinnedOnly()) {
    result = result.filter((n) => n.pinned);
  }

  // 排序: 置顶在前，然后按时间倒序
  return [...result].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.created.localeCompare(a.created);
  });
});

// --- 所有标签列表 (去重) ---
export const allTags = createMemo(() => {
  const tagSet = new Set<string>();
  for (const note of notes()) {
    for (const tag of note.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
});

// --- IPC 操作 ---

/** 从后端加载所有笔记到前端缓存 */
export async function loadNotes() {
  const result = await invoke<Note[]>("get_all_notes");
  setNotes(result);
}

/** 创建新笔记 */
export async function createNote(
  content: string,
  tags: string[],
  pinned: boolean = false
) {
  const note = await invoke<Note>("create_note", { content, tags, pinned });
  setNotes((prev) => [note, ...prev]);
  return note;
}

/** 更新笔记 */
export async function updateNote(
  id: string,
  content: string,
  tags: string[],
  pinned: boolean
) {
  const note = await invoke<Note>("update_note", { id, content, tags, pinned });
  setNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
  return note;
}

/** 删除笔记 */
export async function deleteNote(id: string) {
  await invoke("delete_note_cmd", { id });
  setNotes((prev) => prev.filter((n) => n.id !== id));
}

// 导出 getter/setter 供组件使用
export {
  notes,
  searchQuery,
  setSearchQuery,
  activeTag,
  setActiveTag,
  showPinnedOnly,
  setShowPinnedOnly,
};
```

- [ ] **Step 2: Create config store**

Create `src/config-store.ts`:

```typescript
/**
 * 配置状态管理 —— 读写应用设置
 *
 * 配置项: 快捷键、呼出模式、主题、开机自启、笔记目录
 * 变更时同步保存到后端 config.json
 */

import { createSignal } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

/** 应用配置结构 (与 Rust 端 AppConfig 对应) */
export interface AppConfig {
  hotkey: string;
  mode: "center" | "sidebar";
  theme: "dark" | "light";
  autostart: boolean;
  notesDir: string;
}

const [config, setConfig] = createSignal<AppConfig>({
  hotkey: "Alt+Space",
  mode: "center",
  theme: "dark",
  autostart: true,
  notesDir: "",
});

/** 当前视图: center / sidebar / settings */
const [currentView, setCurrentView] = createSignal<string>("center");

/** 从后端加载配置 */
export async function loadConfig() {
  const result = await invoke<AppConfig>("get_config");
  setConfig(result);
  setCurrentView(result.mode);
}

/** 更新全量配置 */
export async function saveConfig(newConfig: AppConfig) {
  await invoke("update_config", { newConfig });
  setConfig(newConfig);
}

/** 更新快捷键 (单独命令，因为需要重新注册) */
export async function updateHotkey(hotkey: string) {
  await invoke("update_hotkey", { hotkey });
  setConfig((prev) => ({ ...prev, hotkey }));
}

/** 设置开机自启 */
export async function setAutostart(enabled: boolean) {
  await invoke("set_autostart", { enabled });
  setConfig((prev) => ({ ...prev, autostart: enabled }));
}

export { config, setConfig, currentView, setCurrentView };
```

- [ ] **Step 3: Verify compilation**

```bash
cd D:/QuickNote
npm run tauri dev
```

Expected: No TypeScript compilation errors. App still shows placeholder UI.

- [ ] **Step 4: Commit**

```bash
cd D:/QuickNote
git add src/notes-store.ts src/config-store.ts
git commit -m "feat: add frontend stores with IPC wrappers for notes and config"
```

---

### Task 8: Center Mode UI

**Files:**
- Create: `src/CenterMode.tsx`
- Modify: `src/App.tsx` (route to CenterMode)
- Modify: `src/styles.css` (add center mode styles)

- [ ] **Step 1: Create CenterMode component**

Create `src/CenterMode.tsx`:

```tsx
/**
 * 居中输入框模式 —— 类似 Spotlight 的快捷输入
 *
 * 交互逻辑:
 * - 窗口获得焦点时自动聚焦输入框
 * - Enter: 保存笔记并隐藏窗口
 * - Shift+Enter: 换行
 * - Ctrl+S: 切换置顶状态
 * - Esc: 隐藏窗口
 * - #标签名: 自动识别为标签
 */

import { createSignal, onMount, onCleanup } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createNote } from "./notes-store";

export default function CenterMode() {
  let inputRef!: HTMLTextAreaElement;
  const [content, setContent] = createSignal("");
  const [pinned, setPinned] = createSignal(false);

  onMount(async () => {
    // 每次窗口获得焦点时，聚焦输入框并清空内容
    const unlisten = await listen("tauri://focus", () => {
      setContent("");
      setPinned(false);
      inputRef?.focus();
    });
    onCleanup(() => unlisten());

    // 首次挂载也聚焦
    inputRef?.focus();
  });

  /** 从文本中提取 #标签 并返回 [清理后的文本, 标签数组] */
  function extractTags(text: string): [string, string[]] {
    const tagRegex = /#([^\s#]+)/g;
    const tags: string[] = [];
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
      tags.push(match[1]);
    }
    // 从正文中移除标签文本
    const cleanContent = text.replace(/#[^\s#]+\s?/g, "").trim();
    return [cleanContent, tags];
  }

  async function handleSave() {
    const raw = content().trim();
    if (!raw) return;

    const [cleanContent, tags] = extractTags(raw);
    await createNote(cleanContent || raw, tags, pinned());

    setContent("");
    setPinned(false);

    // 保存后隐藏窗口
    const window = getCurrentWindow();
    await window.hide();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      // Enter 保存
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      // Esc 隐藏
      getCurrentWindow().hide();
    } else if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+S 切换置顶
      e.preventDefault();
      setPinned((prev) => !prev);
    }
  }

  return (
    <div class="center-overlay">
      <div class="center-card">
        <div class="center-input-row">
          <span class="center-icon">{pinned() ? "\u2605" : "\u270E"}</span>
          <textarea
            ref={inputRef}
            class="center-input"
            placeholder="记下你的灵感..."
            value={content()}
            onInput={(e) => setContent(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>
        <div class="center-footer">
          <div class="center-hints-left">
            <span class="hint-tag">#标签</span>
            <span
              class={"hint-pin" + (pinned() ? " active" : "")}
              onClick={() => setPinned((p) => !p)}
            >
              {"\u2605"} 收藏
            </span>
          </div>
          <div class="center-hints-right">
            <span class="hint">Enter 保存</span>
            <span class="hint">Esc 关闭</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to render CenterMode**

Replace `src/App.tsx`:

```tsx
/**
 * 根组件 —— 根据 currentView 信号渲染不同视图
 * - "center": 居中输入框
 * - "sidebar": 侧边栏 (Task 9)
 * - "settings": 设置页面 (Task 11)
 */

import { onMount, Show, onCleanup } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { loadNotes } from "./notes-store";
import { loadConfig, config, currentView, setCurrentView } from "./config-store";
import CenterMode from "./CenterMode";

export default function App() {
  onMount(async () => {
    // 启动时加载配置和笔记
    await loadConfig();
    await loadNotes();

    // 根据配置设置初始视图
    setCurrentView(config().mode);

    // 监听后端发来的导航事件 (如托盘菜单点击"设置")
    const unlisten = await listen<string>("navigate", (event) => {
      setCurrentView(event.payload);
    });
    onCleanup(() => unlisten());
  });

  return (
    <div class="app" data-theme={config().theme}>
      <Show when={currentView() === "center"}>
        <CenterMode />
      </Show>
      <Show when={currentView() === "sidebar"}>
        <div>侧边栏 (待实现)</div>
      </Show>
      <Show when={currentView() === "settings"}>
        <div>设置 (待实现)</div>
      </Show>
    </div>
  );
}
```

- [ ] **Step 3: Add center mode styles to styles.css**

Append to `src/styles.css`:

```css
/* ===== 暗色主题变量 (默认) ===== */
[data-theme="dark"], :root {
  --bg-primary: #1e1e2e;
  --bg-secondary: #2a2a3e;
  --bg-overlay: rgba(0, 0, 0, 0.3);
  --border: #3a3a5e;
  --text-primary: #e0e0e0;
  --text-secondary: #888;
  --text-hint: #555;
  --accent: #6a9eff;
  --tag-bg: #3a3a5e;
  --tag-text: #6a9eff;
  --pin-active: #ffd700;
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

/* ===== 亮色主题 ===== */
[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-overlay: rgba(0, 0, 0, 0.1);
  --border: #e0e0e0;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-hint: #999999;
  --accent: #4a7eff;
  --tag-bg: #e8e8f0;
  --tag-text: #4a7eff;
  --pin-active: #f5a623;
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.app {
  width: 100%;
  height: 100%;
}

/* ===== 居中输入框模式 ===== */
.center-overlay {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-card {
  width: 100%;
  max-width: 480px;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

.center-input-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.center-icon {
  color: var(--text-secondary);
  font-size: 18px;
  line-height: 36px;
}

.center-input {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  min-height: 36px;
  max-height: 120px;
  line-height: 1.5;
}

.center-input::placeholder {
  color: var(--text-hint);
}

.center-input:focus {
  border-color: var(--accent);
}

.center-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.center-hints-left {
  display: flex;
  gap: 6px;
}

.center-hints-right {
  display: flex;
  gap: 12px;
}

.hint-tag {
  background: var(--tag-bg);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.hint-pin {
  background: var(--tag-bg);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.hint-pin.active {
  color: var(--pin-active);
}

.hint {
  color: var(--text-hint);
  font-size: 11px;
}
```

- [ ] **Step 4: Test center mode**

```bash
cd D:/QuickNote
npm run tauri dev
```

Expected: Press Alt+Space → transparent window with centered input card appears. Type text → press Enter → window hides. Press Alt+Space again → empty input ready. Esc also hides.

- [ ] **Step 5: Commit**

```bash
cd D:/QuickNote
git add src/CenterMode.tsx src/App.tsx src/styles.css
git commit -m "feat: add center mode UI with tag extraction and hotkey support"
```

---

### Task 9: Sidebar Mode UI

**Files:**
- Create: `src/Sidebar.tsx`
- Create: `src/NoteItem.tsx`
- Modify: `src/App.tsx` (add Sidebar import)
- Modify: `src/styles.css` (add sidebar styles)

- [ ] **Step 1: Create NoteItem component**

Create `src/NoteItem.tsx`:

```tsx
/**
 * 笔记卡片组件 —— 在侧边栏列表中展示单条笔记
 *
 * 点击展开编辑，支持修改内容/标签、切换置顶、删除
 */

import { createSignal, Show } from "solid-js";
import { Note, updateNote, deleteNote } from "./notes-store";

interface Props {
  note: Note;
}

export default function NoteItem(props: Props) {
  const [expanded, setExpanded] = createSignal(false);
  const [editContent, setEditContent] = createSignal(props.note.content);
  const [editTags, setEditTags] = createSignal(props.note.tags.join(", "));

  /** 保存编辑 */
  async function handleSave() {
    const tags = editTags()
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    await updateNote(props.note.id, editContent(), tags, props.note.pinned);
    setExpanded(false);
  }

  /** 切换置顶 */
  async function handleTogglePin() {
    await updateNote(
      props.note.id,
      props.note.content,
      props.note.tags,
      !props.note.pinned
    );
  }

  /** 删除笔记 */
  async function handleDelete() {
    await deleteNote(props.note.id);
  }

  /** 格式化时间: "2026-04-05T14:30:52" → "04-05 14:30" */
  function formatTime(created: string): string {
    return created.slice(5, 16).replace("T", " ");
  }

  return (
    <div class={"note-item" + (expanded() ? " expanded" : "")}>
      {/* 折叠状态: 显示摘要 */}
      <div class="note-header" onClick={() => setExpanded(!expanded())}>
        <div class="note-title-row">
          <span class="note-title">
            {props.note.pinned && <span class="pin-icon">{"\u2605"} </span>}
            {props.note.content.slice(0, 30)}
            {props.note.content.length > 30 ? "..." : ""}
          </span>
          <span class="note-time">{formatTime(props.note.created)}</span>
        </div>
        <Show when={props.note.tags.length > 0}>
          <div class="note-tags">
            {props.note.tags.map((tag) => (
              <span class="note-tag">#{tag}</span>
            ))}
          </div>
        </Show>
      </div>

      {/* 展开状态: 编辑区域 */}
      <Show when={expanded()}>
        <div class="note-edit">
          <textarea
            class="note-edit-input"
            value={editContent()}
            onInput={(e) => setEditContent(e.currentTarget.value)}
          />
          <input
            class="note-edit-tags"
            placeholder="标签 (逗号分隔)"
            value={editTags()}
            onInput={(e) => setEditTags(e.currentTarget.value)}
          />
          <div class="note-actions">
            <button class="btn-save" onClick={handleSave}>保存</button>
            <button class="btn-pin" onClick={handleTogglePin}>
              {props.note.pinned ? "取消置顶" : "置顶"}
            </button>
            <button class="btn-delete" onClick={handleDelete}>删除</button>
          </div>
        </div>
      </Show>
    </div>
  );
}
```

- [ ] **Step 2: Create Sidebar component**

Create `src/Sidebar.tsx`:

```tsx
/**
 * 侧边栏模式 —— 笔记列表 + 新建输入 + 标签筛选
 *
 * 布局 (从上到下):
 * 1. 顶部标题栏 (标题 + 搜索/设置按钮)
 * 2. 新建笔记输入框
 * 3. 笔记列表 (可滚动)
 * 4. 底部标签筛选栏
 */

import { createSignal, For, Show, onMount, onCleanup } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  filteredNotes,
  allTags,
  createNote,
  searchQuery,
  setSearchQuery,
  activeTag,
  setActiveTag,
  showPinnedOnly,
  setShowPinnedOnly,
  loadNotes,
} from "./notes-store";
import { setCurrentView } from "./config-store";
import NoteItem from "./NoteItem";

export default function Sidebar() {
  const [newContent, setNewContent] = createSignal("");
  const [showSearch, setShowSearch] = createSignal(false);
  let newInputRef!: HTMLInputElement;

  onMount(async () => {
    // 窗口获得焦点时刷新笔记列表
    const unlisten = await listen("tauri://focus", async () => {
      await loadNotes();
      newInputRef?.focus();
    });
    onCleanup(() => unlisten());
  });

  /** 新建笔记 */
  async function handleCreate() {
    const raw = newContent().trim();
    if (!raw) return;

    // 提取标签
    const tagRegex = /#([^\s#]+)/g;
    const tags: string[] = [];
    let match;
    while ((match = tagRegex.exec(raw)) !== null) {
      tags.push(match[1]);
    }
    const cleanContent = raw.replace(/#[^\s#]+\s?/g, "").trim();

    await createNote(cleanContent || raw, tags);
    setNewContent("");
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    } else if (e.key === "Escape") {
      getCurrentWindow().hide();
    } else if (e.key === "f" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+F 切换搜索栏
      e.preventDefault();
      setShowSearch((s) => !s);
    }
  }

  return (
    <div class="sidebar" onKeyDown={handleKeyDown}>
      {/* 顶部标题栏 */}
      <div class="sidebar-header">
        <span class="sidebar-title">QuickNote</span>
        <div class="sidebar-actions">
          <button
            class="icon-btn"
            onClick={() => setShowSearch((s) => !s)}
            title="搜索"
          >
            {"\uD83D\uDD0D"}
          </button>
          <button
            class="icon-btn"
            onClick={() => setCurrentView("settings")}
            title="设置"
          >
            {"\u2699"}
          </button>
        </div>
      </div>

      {/* 搜索栏 (可折叠) */}
      <Show when={showSearch()}>
        <div class="sidebar-search">
          <input
            class="search-input"
            placeholder="搜索笔记..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </div>
      </Show>

      {/* 新建笔记输入 */}
      <div class="sidebar-new">
        <input
          ref={newInputRef}
          class="new-input"
          placeholder="+ 新建笔记..."
          value={newContent()}
          onInput={(e) => setNewContent(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
        />
      </div>

      {/* 笔记列表 */}
      <div class="sidebar-list">
        <For each={filteredNotes()} fallback={<div class="empty-hint">暂无笔记</div>}>
          {(note) => <NoteItem note={note} />}
        </For>
      </div>

      {/* 底部: 标签筛选 + 收藏筛选 */}
      <div class="sidebar-filters">
        <button
          class={"filter-btn" + (showPinnedOnly() ? " active" : "")}
          onClick={() => setShowPinnedOnly((v) => !v)}
        >
          {"\u2605"} 收藏
        </button>
        <Show when={activeTag()}>
          <button class="filter-btn active" onClick={() => setActiveTag(null)}>
            #{activeTag()} ✕
          </button>
        </Show>
        <For each={allTags()}>
          {(tag) => (
            <Show when={tag !== activeTag()}>
              <button
                class="filter-btn"
                onClick={() => setActiveTag(tag)}
              >
                #{tag}
              </button>
            </Show>
          )}
        </For>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx to import Sidebar**

In `src/App.tsx`, add the import:

```tsx
import Sidebar from "./Sidebar";
```

Replace the sidebar placeholder:

```tsx
      <Show when={currentView() === "sidebar"}>
        <Sidebar />
      </Show>
```

- [ ] **Step 4: Add sidebar styles to styles.css**

Append to `src/styles.css`:

```css
/* ===== 侧边栏模式 ===== */
.sidebar {
  width: 100%;
  height: 100vh;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
}

.icon-btn:hover {
  color: var(--text-primary);
}

/* 搜索栏 */
.sidebar-search {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.search-input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--accent);
}

/* 新建笔记 */
.sidebar-new {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.new-input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

.new-input:focus {
  border-color: var(--accent);
}

/* 笔记列表 */
.sidebar-list {
  flex: 1;
  overflow-y: auto;
}

.empty-hint {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-hint);
  font-size: 13px;
}

/* 笔记卡片 */
.note-item {
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.note-item.expanded {
  background: var(--bg-secondary);
}

.note-header {
  padding: 10px 12px;
}

.note-header:hover {
  background: var(--bg-secondary);
}

.note-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.note-title {
  color: var(--text-primary);
  font-size: 13px;
}

.pin-icon {
  color: var(--pin-active);
}

.note-time {
  color: var(--text-hint);
  font-size: 10px;
  flex-shrink: 0;
}

.note-tags {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.note-tag {
  background: var(--tag-bg);
  color: var(--tag-text);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
}

/* 笔记编辑区 */
.note-edit {
  padding: 0 12px 10px;
}

.note-edit-input {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 6px;
}

.note-edit-tags {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 8px;
}

.note-actions {
  display: flex;
  gap: 6px;
}

.note-actions button {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.btn-save {
  background: var(--accent);
  color: #fff;
}

.btn-pin {
  background: var(--tag-bg);
  color: var(--text-secondary);
}

.btn-delete {
  background: transparent;
  color: #e74c3c;
  margin-left: auto;
}

/* 底部筛选栏 */
.sidebar-filters {
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-btn {
  background: var(--tag-bg);
  color: var(--text-secondary);
  border: none;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.filter-btn.active {
  background: var(--accent);
  color: #fff;
}

.filter-btn:hover {
  opacity: 0.8;
}
```

- [ ] **Step 5: Test sidebar mode**

```bash
cd D:/QuickNote
npm run tauri dev
```

Test: Right-click tray → "切换模式" → Alt+Space should now show the sidebar panel on the right side. Create some notes, verify they appear in the list. Click a note to expand and edit. Toggle pinned. Delete a note.

- [ ] **Step 6: Commit**

```bash
cd D:/QuickNote
git add src/Sidebar.tsx src/NoteItem.tsx src/App.tsx src/styles.css
git commit -m "feat: add sidebar mode with note list, create, edit, delete"
```

---

### Task 10: Search & Filter

Search and filter logic is already built into `notes-store.ts` (Task 7) and the Sidebar UI (Task 9). This task verifies it works end-to-end and handles the mode-switch navigation correctly.

**Files:**
- Modify: `src/App.tsx` (handle mode switching from backend event)

- [ ] **Step 1: Add mode-aware navigation to App.tsx**

In `src/App.tsx`, update the `onMount` to also listen for window focus and set the view based on config mode:

```tsx
    // 窗口获得焦点时，如果当前不在设置页，恢复到配置的模式
    const unlistenFocus = await listen("tauri://focus", () => {
      if (currentView() !== "settings") {
        setCurrentView(config().mode);
      }
    });
    onCleanup(() => {
      unlisten();
      unlistenFocus();
    });
```

- [ ] **Step 2: Test search and filter flow**

```bash
cd D:/QuickNote
npm run tauri dev
```

Test steps:
1. Switch to sidebar mode via tray menu
2. Create several notes with different tags (e.g., `买咖啡 #生活`, `项目方案 #工作`)
3. Click the search icon → type a keyword → verify filtering works
4. Click a tag in the filter bar → verify only that tag's notes show
5. Click "收藏" filter → verify only pinned notes show
6. Combine search + tag filter → verify both apply

- [ ] **Step 3: Commit**

```bash
cd D:/QuickNote
git add src/App.tsx
git commit -m "feat: add mode-aware navigation and verify search/filter"
```

---

### Task 11: Settings Page

**Files:**
- Create: `src/Settings.tsx`
- Modify: `src/App.tsx` (import Settings)
- Modify: `src/styles.css` (add settings styles)
- Modify: `src-tauri/src/commands.rs` (add navigate_back command)

- [ ] **Step 1: Create Settings component**

Create `src/Settings.tsx`:

```tsx
/**
 * 设置页面 —— 应用配置管理
 *
 * 可配置项:
 * - 全局快捷键 (按键录入)
 * - 呼出模式 (居中/侧边栏)
 * - 主题 (暗色/亮色)
 * - 开机自启 (开/关)
 * - 笔记存储目录
 *
 * 进入时禁用窗口自动隐藏，退出时恢复
 */

import { createSignal, onMount, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  config,
  saveConfig,
  updateHotkey,
  setAutostart,
  setCurrentView,
  AppConfig,
} from "./config-store";

export default function Settings() {
  const [localConfig, setLocalConfig] = createSignal<AppConfig>({ ...config() });
  const [recording, setRecording] = createSignal(false);
  const [hotkeyDisplay, setHotkeyDisplay] = createSignal(config().hotkey);

  onMount(async () => {
    // 进入设置页时，禁用窗口自动隐藏
    await invoke("set_prevent_hide", { prevent: true });
  });

  onCleanup(async () => {
    // 离开设置页时，恢复窗口自动隐藏
    await invoke("set_prevent_hide", { prevent: false });
  });

  /** 快捷键录入: 捕获按键组合 */
  function handleHotkeyKeyDown(e: KeyboardEvent) {
    if (!recording()) return;
    e.preventDefault();

    // 忽略单独的修饰键
    if (["Alt", "Control", "Shift", "Meta"].includes(e.key)) return;

    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Control");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.metaKey) parts.push("Super");
    parts.push(e.code); // 使用 e.code 匹配 Tauri 快捷键格式

    const hotkeyStr = parts.join("+");
    setHotkeyDisplay(hotkeyStr);
    setLocalConfig((c) => ({ ...c, hotkey: hotkeyStr }));
    setRecording(false);
  }

  /** 保存所有设置 */
  async function handleSave() {
    const newConfig = localConfig();

    // 快捷键变更需要单独处理 (注销旧的 + 注册新的)
    if (newConfig.hotkey !== config().hotkey) {
      try {
        await updateHotkey(newConfig.hotkey);
      } catch (e) {
        alert("快捷键注册失败: " + e);
        return;
      }
    }

    // 开机自启变更
    if (newConfig.autostart !== config().autostart) {
      await setAutostart(newConfig.autostart);
    }

    // 保存全量配置
    await saveConfig(newConfig);

    // 返回到配置的模式并调整窗口
    await invoke("set_prevent_hide", { prevent: false });
    setCurrentView(newConfig.mode);
    await invoke("apply_mode", { mode: newConfig.mode });
  }

  /** 返回到之前的模式 */
  async function handleBack() {
    await invoke("set_prevent_hide", { prevent: false });
    const mode = localConfig().mode;
    setCurrentView(mode);
    // 通知后端调整窗口尺寸/位置
    await invoke("apply_mode", { mode });
  }

  return (
    <div class="settings">
      <div class="settings-header">
        <button class="back-btn" onClick={handleBack}>{"\u2190"} 返回</button>
        <h2 class="settings-title">设置</h2>
      </div>

      <div class="settings-body">
        {/* 快捷键 */}
        <div class="setting-item">
          <label class="setting-label">全局快捷键</label>
          <div class="hotkey-input">
            <input
              class="hotkey-display"
              value={recording() ? "按下组合键..." : hotkeyDisplay()}
              readOnly
              onFocus={() => setRecording(true)}
              onBlur={() => setRecording(false)}
              onKeyDown={handleHotkeyKeyDown}
            />
          </div>
        </div>

        {/* 呼出模式 */}
        <div class="setting-item">
          <label class="setting-label">呼出模式</label>
          <div class="setting-options">
            <button
              class={"option-btn" + (localConfig().mode === "center" ? " active" : "")}
              onClick={() => setLocalConfig((c) => ({ ...c, mode: "center" }))}
            >
              居中输入框
            </button>
            <button
              class={"option-btn" + (localConfig().mode === "sidebar" ? " active" : "")}
              onClick={() => setLocalConfig((c) => ({ ...c, mode: "sidebar" }))}
            >
              侧边栏
            </button>
          </div>
        </div>

        {/* 主题 */}
        <div class="setting-item">
          <label class="setting-label">主题</label>
          <div class="setting-options">
            <button
              class={"option-btn" + (localConfig().theme === "dark" ? " active" : "")}
              onClick={() => setLocalConfig((c) => ({ ...c, theme: "dark" }))}
            >
              暗色
            </button>
            <button
              class={"option-btn" + (localConfig().theme === "light" ? " active" : "")}
              onClick={() => setLocalConfig((c) => ({ ...c, theme: "light" }))}
            >
              亮色
            </button>
          </div>
        </div>

        {/* 开机自启 */}
        <div class="setting-item">
          <label class="setting-label">开机自启</label>
          <button
            class={"toggle-btn" + (localConfig().autostart ? " active" : "")}
            onClick={() =>
              setLocalConfig((c) => ({ ...c, autostart: !c.autostart }))
            }
          >
            {localConfig().autostart ? "已开启" : "已关闭"}
          </button>
        </div>

        {/* 笔记目录 */}
        <div class="setting-item">
          <label class="setting-label">笔记存储目录</label>
          <input
            class="dir-input"
            value={localConfig().notesDir}
            onInput={(e) =>
              setLocalConfig((c) => ({ ...c, notesDir: e.currentTarget.value }))
            }
          />
        </div>
      </div>

      <div class="settings-footer">
        <button class="save-btn" onClick={handleSave}>保存设置</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to import Settings**

Add import in `src/App.tsx`:

```tsx
import Settings from "./Settings";
```

Replace the settings placeholder:

```tsx
      <Show when={currentView() === "settings"}>
        <Settings />
      </Show>
```

- [ ] **Step 3: Add settings styles to styles.css**

Append to `src/styles.css`:

```css
/* ===== 设置页面 ===== */
.settings {
  width: 100%;
  height: 100vh;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.settings-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
}

.back-btn:hover {
  color: var(--text-primary);
}

.settings-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.settings-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.setting-item {
  margin-bottom: 24px;
}

.setting-label {
  display: block;
  color: var(--text-secondary);
  font-size: 12px;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hotkey-display {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 14px;
  width: 200px;
  outline: none;
  cursor: pointer;
  text-align: center;
}

.hotkey-display:focus {
  border-color: var(--accent);
}

.setting-options {
  display: flex;
  gap: 8px;
}

.option-btn {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
}

.option-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.toggle-btn {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
}

.toggle-btn.active {
  background: #27ae60;
  border-color: #27ae60;
  color: #fff;
}

.dir-input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

.dir-input:focus {
  border-color: var(--accent);
}

.settings-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

.save-btn {
  width: 100%;
  padding: 10px;
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.save-btn:hover {
  opacity: 0.9;
}
```

- [ ] **Step 4: Test settings page**

```bash
cd D:/QuickNote
npm run tauri dev
```

Test steps:
1. Right-click tray → "设置" → settings page opens (600x500, centered)
2. Click the hotkey field → press a new key combo → verify it displays
3. Toggle mode, theme, autostart
4. Click "保存设置" → verify settings persist (close and reopen)
5. Click "返回" → verify window returns to normal mode

- [ ] **Step 5: Commit**

```bash
cd D:/QuickNote
git add src/Settings.tsx src/App.tsx src/styles.css
git commit -m "feat: add settings page with hotkey recorder, mode/theme toggles"
```

---

### Task 12: Polish & Build

**Files:**
- Modify: `src/styles.css` (scrollbar and polish)

- [ ] **Step 1: Add scrollbar and final polish to styles.css**

Append to `src/styles.css`:

```css
/* ===== 滚动条美化 ===== */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-hint);
}

/* ===== 全局过渡动画 ===== */
.center-card,
.sidebar,
.settings {
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Full end-to-end test**

```bash
cd D:/QuickNote
npm run tauri dev
```

Test checklist:
1. Alt+Space shows center mode → type → Enter saves → window hides
2. Tray → 切换模式 → Alt+Space shows sidebar → create/edit/delete notes
3. Sidebar: search, tag filter, pinned filter all work
4. Tray → 设置 → change hotkey, mode, theme → save → settings applied
5. Close app → reopen → settings persisted
6. Esc hides window in both modes
7. Click outside window hides it (except in settings)
8. Dark/light theme renders correctly

- [ ] **Step 3: Commit**

```bash
cd D:/QuickNote
git add -A
git commit -m "feat: add window mode switching, polish styles, complete MVP"
```

- [ ] **Step 4: Build MSI installer**

```bash
cd D:/QuickNote
npm run tauri build
```

Expected: Build completes. MSI installer is at `src-tauri/target/release/bundle/msi/QuickNote_0.1.0_x64_en-US.msi`.

- [ ] **Step 5: Commit build configuration**

```bash
cd D:/QuickNote
git add -A
git commit -m "chore: verify build produces MSI installer"
```
