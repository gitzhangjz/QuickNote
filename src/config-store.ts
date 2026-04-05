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
