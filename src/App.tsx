/**
 * 根组件 —— 根据 currentView 信号渲染不同视图
 * - "center": 居中输入框
 * - "sidebar": 侧边栏
 * - "settings": 设置页面
 */

import { onMount, Show, onCleanup } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { loadNotes } from "./notes-store";
import { loadConfig, config, currentView, setCurrentView, applyTheme, ThemeName, saveConfig, updateHotkey, setAutostart } from "./config-store";
import CenterMode from "./CenterMode";
import Sidebar from "./Sidebar";
import Settings from "./Settings";

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

    // 监听后端发来的主题变更事件 (如托盘菜单点击主题)
    const unlistenTheme = await listen<string>("theme_changed", (event) => {
      applyTheme(event.payload as ThemeName);
    });

    // 窗口获得焦点时，如果当前不在设置页，恢复到配置的模式
    const unlistenFocus = await listen("tauri://focus", () => {
      if (currentView() !== "settings") {
        setCurrentView(config().mode);
      }
    });

    // 全局 Esc 键 —— 在设置页时自动保存并退出
    async function handleGlobalEsc(e: KeyboardEvent) {
      if (currentView() !== "settings") return;
      e.preventDefault();

      const localConfig = (window as any).__settingsLocalConfig;
      const recording = (window as any).__settingsRecording;
      if (recording) return;

      if (localConfig) {
        const newConfig = localConfig();
        if (newConfig.hotkey !== config().hotkey) {
          try { await updateHotkey(newConfig.hotkey); } catch {}
        }
        if (newConfig.autostart !== config().autostart) {
          try { await setAutostart(newConfig.autostart); } catch {}
        }
        await saveConfig(newConfig);
        setCurrentView(newConfig.mode);
        await invoke("apply_mode", { mode: newConfig.mode });
      } else {
        setCurrentView(config().mode);
      }
      await invoke("set_prevent_hide", { prevent: false });
    }
    document.addEventListener("keydown", handleGlobalEsc);

    onCleanup(() => {
      unlisten();
      unlistenFocus();
      unlistenTheme();
      document.removeEventListener("keydown", handleGlobalEsc);
    });
  });

  return (
    <div class="app" data-theme={config().theme}>
      <Show when={currentView() === "center"}>
        <CenterMode />
      </Show>
      <Show when={currentView() === "sidebar"}>
        <Sidebar />
      </Show>
      <Show when={currentView() === "settings"}>
        <Settings />
      </Show>
    </div>
  );
}
