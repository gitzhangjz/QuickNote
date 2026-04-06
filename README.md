# QuickNote

轻量级桌面便签工具，支持全局热键快速唤起，本地优先存储。

## 功能特性

- **全局热键唤起** — 默认 `Alt+Space`（可自定义），随时呼出
- **双模式界面** — 居中输入框 / 右侧边栏，自由切换
- **8 种主题配色** — 暗夜、明亮、AMOLED、深海、森林、日落、樱花、赛博朋克
- **系统托盘** — 后台运行，右键菜单快速切换主题
- **标签系统** — `#标签` 语法 + 自动补全
- **搜索与筛选** — 全文搜索、按标签过滤、置顶笔记
- **本地优先** — 笔记以 Markdown 文件存储在 `~/QuickNote/notes/`
- **开机自启** — 可选 Windows/macOS 开机启动

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Solid.js + TypeScript + Vite |
| 后端 | Rust + Tauri v2 |
| 平台 | Windows / macOS |

## 数据存储

- **笔记**: `~/QuickNote/notes/{date}_{time}_{id}.md`（Markdown 格式，YAML frontmatter）
- **配置**: `~/QuickNote/config.json`

## 环境要求

### Windows
- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（勾选 "Desktop development with C++"）

### macOS
- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- Xcode Command Line Tools: `xcode-select --install`

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev
```

## 打包

### Windows

```bash
npm run tauri build
```

输出目录：`src-tauri/target/release/bundle/msi/`

生成 `.msi` 安装包，双击安装即可。

### macOS

将 `tauri.conf.json` 中的 bundle 目标改为 `dmg`：

```json
"bundle": {
  "targets": ["dmg"]
}
```

然后运行：

```bash
npm run tauri build
```

输出目录：`src-tauri/target/release/bundle/dmg/`

生成 `.dmg` 磁盘映像，拖入 Applications 即可使用。

## 安装后使用

1. 运行 QuickNote
2. 按默认热键 `Alt+Space`（macOS: `Option+Space`）呼出
3. 输入笔记内容，按 `Enter` 保存
4. 右键托盘图标可切换主题、打开设置

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Alt+Space` | 显示/隐藏窗口（可自定义） |
| `Enter` | 保存笔记并隐藏窗口 |
| `Shift+Enter` | 换行 |
| `Ctrl+S` | 切换置顶 |
| `Ctrl+M` | 切换居中/侧边栏模式 |
| `Esc` | 关闭标签建议 / 隐藏窗口 |

## 项目结构

```
QuickNote/
├── src/                    # 前端 (Solid.js + TypeScript)
│   ├── App.tsx             # 根组件，视图路由
│   ├── CenterMode.tsx      # 居中输入框模式
│   ├── Sidebar.tsx         # 侧边栏模式
│   ├── Settings.tsx        # 设置页面
│   ├── notes-store.ts      # 笔记状态管理
│   ├── config-store.ts     # 配置状态管理
│   └── styles.css          # 全局样式 + 8 套主题
├── src-tauri/              # 后端 (Rust)
│   ├── src/
│   │   ├── lib.rs          # 托盘、快捷键、窗口管理
│   │   ├── commands.rs     # Tauri IPC 命令
│   │   ├── note.rs         # 笔记数据模型
│   │   └── config.rs       # 应用配置管理
│   └── tauri.conf.json     # Tauri 配置
├── package.json
└── README.md
```
