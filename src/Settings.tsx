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
