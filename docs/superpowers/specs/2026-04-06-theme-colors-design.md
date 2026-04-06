# QuickNote 多主题配色设计

## 概述

为 QuickNote 添加 8 种主题配色选项，支持在设置页面和托盘菜单中切换。

## 主题列表

| 主题名 | theme 值 | 描述 |
|--------|----------|------|
| 暗夜深色 | `dark` | 当前默认，深蓝灰底色 |
| 明亮浅色 | `light` | 纯净白色背景 |
| AMOLED纯黑 | `amoled` | OLED 友好，省电护眼 |
| 深海蓝 | `ocean` | 冷静专注，适合长时间工作 |
| 森林绿 | `forest` | 护眼自然，缓解视觉疲劳 |
| 日落暖橙 | `sunset` | 温暖活力，创意氛围 |
| 樱花粉 | `sakura` | 柔和浪漫，可爱风格 |
| 赛博朋克 | `cyberpunk` | 霓虹科技，未来感 |

## 配色方案

### CSS 变量定义

每个主题定义以下 CSS 变量：

| 变量名 | 用途 |
|--------|------|
| `--bg-primary` | 主背景色 |
| `--bg-secondary` | 卡片/次级背景 |
| `--bg-overlay` | 遮罩层颜色 |
| `--border` | 边框颜色 |
| `--text-primary` | 主文字颜色 |
| `--text-secondary` | 次级文字颜色 |
| `--text-hint` | 提示文字颜色 |
| `--accent` | 强调色/主题色 |
| `--tag-bg` | 标签背景色 |
| `--tag-text` | 标签文字颜色 |
| `--pin-active` | 置顶图标颜色 |
| `--shadow` | 阴影效果 |

### 具体色值

#### 暗夜深色 (dark) - 默认
```css
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
--shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.4);
```

#### 明亮浅色 (light)
```css
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
--shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.12);
```

#### AMOLED 纯黑 (amoled)
```css
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
```

#### 深海蓝 (ocean)
```css
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
```

#### 森林绿 (forest)
```css
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
```

#### 日落暖橙 (sunset)
```css
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
```

#### 樱花粉 (sakura)
```css
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
```

#### 赛博朋克 (cyberpunk)
```css
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
```

## 数据结构变更

### Rust 端 (config.rs)

```rust
pub struct AppConfig {
    // ...
    pub theme: String,  // 可选值: dark, light, amoled, ocean, forest, sunset, sakura, cyberpunk
}
```

### TypeScript 端 (config-store.ts)

```typescript
export type ThemeName = "dark" | "light" | "amoled" | "ocean" | "forest" | "sunset" | "sakura" | "cyberpunk";

export interface AppConfig {
  // ...
  theme: ThemeName;
}
```

## UI 变更

### 1. 设置页面 (Settings.tsx)

添加主题选择区域：
- 标题：主题颜色
- 展示 8 个颜色方块按钮，每个显示主题名称和代表性颜色
- 点击切换主题，立即生效

布局示意：
```
主题颜色
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 暗夜 │ │ 明亮 │ │ AMOLED│ │ 深海 │
└──────┘ └──────┘ └──────┘ └──────┘
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 森林 │ │ 日落 │ │ 樱花 │ │ 赛博 │
└──────┘ └──────┘ └──────┘ └──────┘
```

### 2. 托盘菜单 (lib.rs)

在托盘右键菜单中添加主题切换子菜单：

```
QuickNote
├── 显示/隐藏
├── 切换主题 ▶
│   ├── 暗夜深色 ✓
│   ├── 明亮浅色
│   ├── AMOLED 纯黑
│   ├── 深海蓝
│   ├── 森林绿
│   ├── 日落暖橙
│   ├── 樱花粉
│   └── 赛博朋克
├── 设置
└── 退出
```

## 切换流程

1. 用户在设置页面或托盘菜单选择主题
2. 调用 `update_theme` 命令更新配置
3. 前端设置 `document.documentElement.setAttribute('data-theme', theme)`
4. 配置保存到 `config.json`
5. 下次启动时自动应用保存的主题

## 实现范围

### 需要修改的文件

1. `src/styles.css` - 添加 6 个新主题的 CSS 变量
2. `src/config-store.ts` - 更新类型定义，添加 `updateTheme` 函数
3. `src/Settings.tsx` - 添加主题选择 UI
4. `src-tauri/src/config.rs` - 更新配置结构
5. `src-tauri/src/commands.rs` - 添加 `update_theme` 命令
6. `src-tauri/src/lib.rs` - 更新托盘菜单，添加主题子菜单

### 不在范围内

- 自定义主题颜色
- 主题导入/导出
- 随主题变化的字体大小
