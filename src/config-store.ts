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
  applyTheme(result.theme);
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

/** 切换模式 (center↔sidebar)，保存配置并调整窗口 */
export async function switchMode() {
  const newMode = config().mode === "center" ? "sidebar" : "center";
  const newConfig = { ...config(), mode: newMode as "center" | "sidebar" };
  await saveConfig(newConfig);
  setCurrentView(newMode);
  await invoke("apply_mode", { mode: newMode });
}

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

export { config, setConfig, currentView, setCurrentView };
