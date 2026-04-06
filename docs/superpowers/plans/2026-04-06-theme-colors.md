# 多主题配色实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 QuickNote 添加 8 种主题配色，支持设置页面和托盘菜单切换。

**Architecture:** 扩展现有 CSS 变量系统，为每个主题定义独立变量集。前端通过 `data-theme` 属性切换，后端提供 `update_theme` 命令保存配置。

**Tech Stack:** Tauri v2, Solid.js, CSS Variables, Rust

---

## 文件结构

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/styles.css` | 修改 | 添加 6 个新主题 CSS 变量 |
| `src/config-store.ts` | 修改 | 更新类型定义，添加 applyTheme 函数 |
| `src/Settings.tsx` | 修改 | 更新主题选择 UI 为 8 个颜色按钮 |
| `src-tauri/src/commands.rs` | 修改 | 添加 update_theme 命令 |
| `src-tauri/src/lib.rs` | 修改 | 托盘菜单添加主题子菜单 |

---

### Task 1: 添加 CSS 主题变量

**Files:**
- Modify: `src/styles.css:18-47`

- [ ] **Step 1: 在现有 dark/light 主题后添加 6 个新主题**

在 `src/styles.css` 文件的 `[data-theme="light"]` 块之后，添加以下 CSS：

```css
/* ===== AMOLED 纯黑主题 ===== */
[data-theme="amoled"] {
  --bg-primary: #000000;
  --bg-secondary: #121212;
  --bg-overlay: rgba(0, 0, 0, 0.5);
  --border: #2a2a2a;
  --text-primary: #e0e0e0;
  --text-secondary: #888;
  --text-hint: #555;
  --accent: #bb86fc;
  --tag-bg: #1e1e1e;
  --tag-text: #bb86fc;
  --pin-active: #ffd700;
  --shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.6);
}

/* ===== 深海蓝主题 ===== */
[data-theme="ocean"] {
  --bg-primary: #0d1b2a;
  --bg-secondary: #1b3a4b;
  --bg-overlay: rgba(0, 0, 0, 0.4);
  --border: #2a5066;
  --text-primary: #caf0f8;
  --text-secondary: #90caf9;
  --text-hint: #5c8ab5;
  --accent: #00b4d8;
  --tag-bg: #1b3a4b;
  --tag-text: #00b4d8;
  --pin-active: #ffd700;
  --shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.5);
}

/* ===== 森林绿主题 ===== */
[data-theme="forest"] {
  --bg-primary: #1a1f16;
  --bg-secondary: #2d3a24;
  --bg-overlay: rgba(0, 0, 0, 0.4);
  --border: #3d5230;
  --text-primary: #d4e7c5;
  --text-secondary: #a8c686;
  --text-hint: #6b8f5e;
  --accent: #7eb77f;
  --tag-bg: #2d3a24;
  --tag-text: #7eb77f;
  --pin-active: #ffd700;
  --shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.5);
}

/* ===== 日落暖橙主题 ===== */
[data-theme="sunset"] {
  --bg-primary: #2d1f1a;
  --bg-secondary: #4a3228;
  --bg-overlay: rgba(0, 0, 0, 0.4);
  --border: #6b4a3a;
  --text-primary: #ffd9b8;
  --text-secondary: #d4a574;
  --text-hint: #a07850;
  --accent: #ff8c42;
  --tag-bg: #4a3228;
  --tag-text: #ff8c42;
  --pin-active: #ffd700;
  --shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.5);
}

/* ===== 樱花粉主题 ===== */
[data-theme="sakura"] {
  --bg-primary: #2a2024;
  --bg-secondary: #4a3540;
  --bg-overlay: rgba(0, 0, 0, 0.4);
  --border: #6b4a58;
  --text-primary: #fce4ec;
  --text-secondary: #f8bbd9;
  --text-hint: #c48b9f;
  --accent: #f4a4ba;
  --tag-bg: #4a3540;
  --tag-text: #f4a4ba;
  --pin-active: #ffd700;
  --shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.5);
}

/* ===== 赛博朋克主题 ===== */
[data-theme="cyberpunk"] {
  --bg-primary: #0a0a0f;
  --bg-secondary: #1a1a2e;
  --bg-overlay: rgba(0, 0, 0, 0.6);
  --border: #2a2a4e;
  --text-primary: #00ffff;
  --text-secondary: #b0b0ff;
  --text-hint: #6060a0;
  --accent: #ff00ff;
  --tag-bg: #1a1a2e;
  --tag-text: #ff00ff;
  --pin-active: #ffff00;
  --shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.6), 0 0 10px rgba(255, 0, 255, 0.2);
}
```

- [ ] **Step 2: 添加主题选择器按钮样式**

在 `src/styles.css` 文件末尾添加主题选择器的样式：

```css
/* ===== 主题选择器 ===== */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.theme-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.theme-btn:hover {
  border-color: var(--text-secondary);
}

.theme-btn.active {
  border-color: var(--accent);
  background: var(--bg-primary);
}

.theme-preview {
  width: 100%;
  height: 24px;
  border-radius: 4px;
  display: flex;
  overflow: hidden;
}

.theme-preview div {
  flex: 1;
}

.theme-name {
  font-size: 11px;
  color: var(--text-secondary);
}

.theme-btn.active .theme-name {
  color: var(--text-primary);
}
```

- [ ] **Step 3: 提交 CSS 变更**

```bash
git add src/styles.css
git commit -m "feat: add 6 new theme color schemes (amoled, ocean, forest, sunset, sakura, cyberpunk)"
```

---

### Task 2: 更新 TypeScript 类型定义和函数

**Files:**
- Modify: `src/config-store.ts`

- [ ] **Step 1: 更新类型定义**

将 `src/config-store.ts` 中的 `AppConfig` 接口的 theme 类型从 `"dark" | "light"` 更新为完整类型：

```typescript
/**
 * 配置状态管理 —— 读写应用设置
 *
 * 配置项: 快捷键、呼出模式、主题、开机自启、笔记目录
 * 变更时同步保存到后端 config.json
 */

import { createSignal } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

/** 主题名称类型 */
export type ThemeName = "dark" | "light" | "amoled" | "ocean" | "forest" | "sunset" | "sakura" | "cyberpunk";

/** 主题配置信息 */
export interface ThemeInfo {
  name: ThemeName;
  label: string;
  colors: {
    bg: string;
    secondary: string;
    accent: string;
    text: string;
  };
}

/** 可用主题列表 */
export const THEMES: ThemeInfo[] = [
  { name: "dark", label: "暗夜", colors: { bg: "#1e1e2e", secondary: "#2a2a3e", accent: "#6a9eff", text: "#e0e0e0" } },
  { name: "light", label: "明亮", colors: { bg: "#ffffff", secondary: "#f5f5f5", accent: "#4a7eff", text: "#333333" } },
  { name: "amoled", label: "AMOLED", colors: { bg: "#000000", secondary: "#121212", accent: "#bb86fc", text: "#e0e0e0" } },
  { name: "ocean", label: "深海", colors: { bg: "#0d1b2a", secondary: "#1b3a4b", accent: "#00b4d8", text: "#caf0f8" } },
  { name: "forest", label: "森林", colors: { bg: "#1a1f16", secondary: "#2d3a24", accent: "#7eb77f", text: "#d4e7c5" } },
  { name: "sunset", label: "日落", colors: { bg: "#2d1f1a", secondary: "#4a3228", accent: "#ff8c42", text: "#ffd9b8" } },
  { name: "sakura", label: "樱花", colors: { bg: "#2a2024", secondary: "#4a3540", accent: "#f4a4ba", text: "#fce4ec" } },
  { name: "cyberpunk", label: "赛博", colors: { bg: "#0a0a0f", secondary: "#1a1a2e", accent: "#ff00ff", text: "#00ffff" } },
];

/** 应用配置结构 (与 Rust 端 AppConfig 对应) */
export interface AppConfig {
  hotkey: string;
  mode: "center" | "sidebar";
  theme: ThemeName;
  autostart: boolean;
  notesDir: string;
}
```

- [ ] **Step 2: 添加 applyTheme 函数**

在 `src/config-store.ts` 中添加应用主题的函数：

```typescript
/** 应用主题到 DOM */
export function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute("data-theme", theme);
}

/** 更新主题 */
export async function updateTheme(theme: ThemeName) {
  await invoke("update_theme", { theme });
  applyTheme(theme);
  setConfig((prev) => ({ ...prev, theme }));
}
```

- [ ] **Step 3: 在 loadConfig 中应用主题**

修改 `loadConfig` 函数，加载配置后立即应用主题：

```typescript
/** 从后端加载配置 */
export async function loadConfig() {
  const result = await invoke<AppConfig>("get_config");
  setConfig(result);
  setCurrentView(result.mode);
  applyTheme(result.theme);
}
```

- [ ] **Step 4: 提交变更**

```bash
git add src/config-store.ts
git commit -m "feat: add ThemeName type and THEMES list, add applyTheme/updateTheme functions"
```

---

### Task 3: 更新设置页面 UI

**Files:**
- Modify: `src/Settings.tsx`

- [ ] **Step 1: 导入主题配置**

在 `src/Settings.tsx` 顶部导入中添加：

```typescript
import {
  config,
  saveConfig,
  updateHotkey,
  setAutostart,
  setCurrentView,
  AppConfig,
  THEMES,
  applyTheme,
} from "./config-store";
```

- [ ] **Step 2: 替换主题选择 UI**

将现有的主题选择部分 (约第 140-157 行) 替换为：

```tsx
        {/* 主题 */}
        <div class="setting-item">
          <label class="setting-label">主题颜色</label>
          <div class="theme-grid">
            {THEMES.map((theme) => (
              <button
                class={"theme-btn" + (localConfig().theme === theme.name ? " active" : "")}
                onClick={() => {
                  setLocalConfig((c) => ({ ...c, theme: theme.name }));
                  applyTheme(theme.name);
                }}
              >
                <div class="theme-preview">
                  <div style={{ background: theme.colors.bg }} />
                  <div style={{ background: theme.colors.secondary }} />
                  <div style={{ background: theme.colors.accent }} />
                  <div style={{ background: theme.colors.text }} />
                </div>
                <span class="theme-name">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>
```

- [ ] **Step 3: 提交变更**

```bash
git add src/Settings.tsx
git commit -m "feat: update settings page with 8 theme color buttons"
```

---

### Task 4: 添加 Rust update_theme 命令

**Files:**
- Modify: `src-tauri/src/commands.rs`

- [ ] **Step 1: 添加 update_theme 命令**

在 `src-tauri/src/commands.rs` 文件末尾添加：

```rust
/// 更新主题
#[tauri::command]
pub fn update_theme(
    state: State<'_, AppState>,
    theme: String,
) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    config.theme = theme;
    let config_clone = config.clone();
    drop(config); // 释放锁再写文件
    crate::config::save_config(&config_clone)
}
```

- [ ] **Step 2: 在 lib.rs 中注册命令**

在 `src-tauri/src/lib.rs` 的 `invoke_handler` 中添加 `update_theme`：

```rust
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
```

- [ ] **Step 3: 提交变更**

```bash
git add src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat: add update_theme IPC command"
```

---

### Task 5: 更新托盘菜单添加主题子菜单

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 添加主题子菜单项**

在 `src-tauri/src/lib.rs` 的 setup 函数中，找到托盘菜单定义部分 (约第 113-120 行)，替换为：

```rust
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

            let theme_menu = Menu::with_items(
                app,
                &[&theme_dark, &theme_light, &theme_amoled, &theme_ocean,
                  &theme_forest, &theme_sunset, &theme_sakura, &theme_cyberpunk],
            )?;
            let theme_item = MenuItem::with_id(app, "theme", "切换主题", true, None::<&str>)?;

            let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[&show_item, &mode_item, &theme_item, &settings_item, &quit_item],
            )?;
```

- [ ] **Step 2: 添加主题切换事件处理**

在 `on_menu_event` 的 match 语句中 (约第 129-160 行)，添加主题切换处理：

```rust
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
```

- [ ] **Step 3: 提交变更**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add theme submenu to system tray"
```

---

### Task 6: 前端监听托盘主题变更事件

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 添加事件监听**

读取 `src/App.tsx` 文件，在适当位置添加对 `theme_changed` 事件的监听：

```typescript
import { onMount, onCleanup } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { applyTheme } from "./config-store";

// 在组件中添加：
onMount(async () => {
  const unlisten = await listen<string>("theme_changed", (event) => {
    applyTheme(event.payload as ThemeName);
  });
  onCleanup(() => unlisten());
});
```

- [ ] **Step 2: 提交变更**

```bash
git add src/App.tsx
git commit -m "feat: listen for theme_changed event from tray menu"
```

---

### Task 7: 最终验证

- [ ] **Step 1: 构建项目**

```bash
npm run tauri build
```

- [ ] **Step 2: 手动测试清单**

1. 启动应用，验证默认主题正常
2. 打开设置页面，点击 8 个主题按钮，验证颜色变化
3. 右键托盘图标，使用主题子菜单切换主题
4. 重启应用，验证主题设置已保存
5. 验证各主题下笔记显示正常

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "feat: complete 8 theme color schemes with settings and tray menu support"
```
