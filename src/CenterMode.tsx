/**
 * 居中输入框模式 —— 类似 Spotlight 的快捷输入
 *
 * 交互逻辑:
 * - 窗口获得焦点时自动聚焦输入框
 * - Enter: 保存笔记并隐藏窗口
 * - Shift+Enter: 换行
 * - Ctrl+S: 切换置顶状态
 * - Esc: 隐藏窗口
 * - #标签名: 自动识别为标签
 */

import { createSignal, onMount, onCleanup } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createNote } from "./notes-store";

export default function CenterMode() {
  let inputRef!: HTMLTextAreaElement;
  const [content, setContent] = createSignal("");
  const [pinned, setPinned] = createSignal(false);

  onMount(async () => {
    // 每次窗口获得焦点时，聚焦输入框并清空内容
    const unlisten = await listen("tauri://focus", () => {
      setContent("");
      setPinned(false);
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
    }
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
        <div class="center-footer">
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
            <span class="hint">Enter 保存</span>
            <span class="hint">Esc 关闭</span>
          </div>
        </div>
      </div>
    </div>
  );
}
