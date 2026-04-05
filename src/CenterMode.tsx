/**
 * 居中输入框模式 —— 类似 Spotlight 的快捷输入 + 最近笔记列表
 *
 * 交互逻辑:
 * - 窗口获得焦点时自动聚焦输入框
 * - Enter: 保存笔记并隐藏窗口
 * - Shift+Enter: 换行
 * - Ctrl+S: 切换置顶状态
 * - Esc: 隐藏窗口
 * - #标签名: 自动识别为标签
 * - 输入框下方显示最近的笔记记录
 */

import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createNote, filteredNotes, loadNotes, deleteNote, updateNote } from "./notes-store";
import { setCurrentView, switchMode } from "./config-store";
import { invoke } from "@tauri-apps/api/core";

export default function CenterMode() {
  let inputRef!: HTMLTextAreaElement;
  const [content, setContent] = createSignal("");
  const [pinned, setPinned] = createSignal(false);

  onMount(async () => {
    // 每次窗口获得焦点时，聚焦输入框并刷新笔记列表
    const unlisten = await listen("tauri://focus", async () => {
      setContent("");
      setPinned(false);
      await loadNotes();
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
    } else if (e.key === "m" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+M 切换模式
      e.preventDefault();
      switchMode();
    }
  }

  /** 格式化时间: "2026-04-05T14:30:52" → "04-05 14:30" */
  function formatTime(created: string): string {
    return created.slice(5, 16).replace("T", " ");
  }

  /** 切换笔记置顶状态 */
  async function handleTogglePin(note: { id: string; content: string; tags: string[]; pinned: boolean }) {
    await updateNote(note.id, note.content, note.tags, !note.pinned);
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
        <div class="center-footer" data-tauri-drag-region>
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
            <button class="icon-btn" onClick={() => switchMode()} title="切换到侧边栏 (Ctrl+M)">
              {"\u21C4"}
            </button>
            <button class="icon-btn" onClick={async () => {
              await invoke("set_prevent_hide", { prevent: true });
              setCurrentView("settings");
              await invoke("apply_mode", { mode: "settings" });
            }} title="设置">
              {"\u2699"}
            </button>
          </div>
        </div>
      </div>

      {/* 最近笔记列表 */}
      <div class="center-notes">
        <For each={filteredNotes().slice(0, 20)}>
          {(note) => (
            <div class="center-note-item">
              <div class="center-note-content">
                <span class="center-note-text">
                  {note.pinned && <span class="pin-icon">{"\u2605"} </span>}
                  {note.content.slice(0, 50)}
                  {note.content.length > 50 ? "..." : ""}
                </span>
                <Show when={note.tags.length > 0}>
                  <span class="center-note-tags">
                    {note.tags.map((tag) => `#${tag}`).join(" ")}
                  </span>
                </Show>
              </div>
              <div class="center-note-actions">
                <span class="center-note-time">{formatTime(note.created)}</span>
                <button
                  class={"center-note-pin" + (note.pinned ? " active" : "")}
                  onClick={() => handleTogglePin(note)}
                  title={note.pinned ? "取消收藏" : "收藏"}
                >
                  {"\u2605"}
                </button>
                <button
                  class="center-note-delete"
                  onClick={() => deleteNote(note.id)}
                  title="删除"
                >
                  {"\u2715"}
                </button>
              </div>
            </div>
          )}
        </For>
        <Show when={filteredNotes().length === 0}>
          <div class="center-note-empty">暂无笔记</div>
        </Show>
      </div>
    </div>
  );
}
