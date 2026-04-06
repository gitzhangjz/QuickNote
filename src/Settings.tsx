/**
 * 设置页面 —— 应用配置管理
 *
 * 可配置项:
 * - 全局快捷键 (按键录入 / 快捷选择)
 * - 呼出模式 (居中/侧边栏)
 * - 主题 (暗色/亮色)
 * - 开机自启 (开/关)
 * - 笔记存储目录
 *
 * 进入时禁用窗口自动隐藏
 * Esc 自动保存并关闭窗口
 * 返回按钮保存并返回主界面
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
  THEMES,
  applyTheme,
} from "./config-store";

/** 常用快捷键预设 */
const HOTKEY_PRESETS = [
  { label: "Alt+Space", value: "Alt+Space" },
  { label: "Ctrl+Space", value: "Control+Space" },
  { label: "Alt+Shift+Space", value: "Alt+Shift+Space" },
];

export default function Settings() {
  const [localConfig, setLocalConfig] = createSignal<AppConfig>({ ...config() });
  const [recording, setRecording] = createSignal(false);
  const [hotkeyDisplay, setHotkeyDisplay] = createSignal(config().hotkey);
  const [saving, setSaving] = createSignal(false);

  /** 保存设置到后端 */
  async function doSave() {
    if (saving()) return;
    setSaving(true);

    const newConfig = localConfig();

    if (newConfig.hotkey !== config().hotkey) {
      await updateHotkey(newConfig.hotkey);
    }
    if (newConfig.autostart !== config().autostart) {
      await setAutostart(newConfig.autostart);
    }
    await saveConfig(newConfig);

    setSaving(false);
  }

  /** 保存并隐藏窗口（Esc / 失焦） */
  async function saveAndHide() {
    await doSave();
    setCurrentView(localConfig().mode);
    await invoke("set_prevent_hide", { prevent: false });
    await invoke("apply_mode", { mode: localConfig().mode });
    await getCurrentWindow().hide();
  }

  /** 保存并返回主界面（返回按钮） */
  async function saveAndBack() {
    await doSave();
    setCurrentView(localConfig().mode);
    await invoke("apply_mode", { mode: localConfig().mode });
    await invoke("set_prevent_hide", { prevent: false });
  }

  onMount(async () => {
    await invoke("set_prevent_hide", { prevent: true });

    // Esc 自动保存并隐藏窗口
    function handleEsc(e: KeyboardEvent) {
      if (recording()) return;
      if (e.key === "Escape") {
        saveAndHide();
      }
    }
    document.addEventListener("keydown", handleEsc);

    onCleanup(() => {
      document.removeEventListener("keydown", handleEsc);
    });
  });

  /** 快捷键录入 */
  function handleHotkeyKeyDown(e: KeyboardEvent) {
    if (!recording()) return;
    e.preventDefault();
    if (["Alt", "Control", "Shift", "Meta"].includes(e.key)) return;

    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Control");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.metaKey) parts.push("Super");
    parts.push(e.code);

    const hotkeyStr = parts.join("+");
    setHotkeyDisplay(hotkeyStr);
    setLocalConfig((c) => ({ ...c, hotkey: hotkeyStr }));
    setRecording(false);
  }

  /** 快捷选择预设 */
  function selectHotkeyPreset(value: string, label: string) {
    setHotkeyDisplay(label);
    setLocalConfig((c) => ({ ...c, hotkey: value }));
    setRecording(false);
  }

  return (
    <div class="settings">
      <div class="settings-header" data-tauri-drag-region>
        <button class="back-btn" onClick={saveAndBack}>{"\u2190"} 返回</button>
        <h2 class="settings-title">设置</h2>
      </div>

      <div class="settings-body">
        {/* 快捷键 */}
        <div class="setting-item">
          <label class="setting-label">全局快捷键</label>
          <div class="setting-options" style={{ "margin-bottom": "8px", "flex-wrap": "wrap" }}>
            {HOTKEY_PRESETS.map((preset) => (
              <button
                class={"option-btn" + (localConfig().hotkey === preset.value ? " active" : "")}
                onClick={() => selectHotkeyPreset(preset.value, preset.label)}
              >
                {preset.label}
              </button>
            ))}
            <button
              class={"option-btn" + (recording() ? " active" : "")}
              onClick={() => setRecording(true)}
            >
              {recording() ? "录入中..." : "自定义"}
            </button>
          </div>
          <input
            class="hotkey-display"
            value={recording() ? "按下组合键..." : hotkeyDisplay()}
            readOnly
            onFocus={() => setRecording(true)}
            onBlur={() => setRecording(false)}
            onKeyDown={handleHotkeyKeyDown}
          />
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
        <button class="save-btn" onClick={saveAndHide}>保存并关闭</button>
      </div>
    </div>
  );
}
