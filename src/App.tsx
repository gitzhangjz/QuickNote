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
import Sidebar from "./Sidebar";

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
        <Sidebar />
      </Show>
      <Show when={currentView() === "settings"}>
        <div>设置 (待实现)</div>
      </Show>
    </div>
  );
}
