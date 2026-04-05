/**
 * 侧边栏模式 —— 笔记列表 + 新建输入 + 标签筛选
 *
 * 布局 (从上到下):
 * 1. 顶部标题栏 (标题 + 搜索/设置按钮)
 * 2. 新建笔记输入框
 * 3. 笔记列表 (可滚动)
 * 4. 底部标签筛选栏
 */

import { createSignal, For, Show, onMount, onCleanup } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  filteredNotes,
  allTags,
  createNote,
  searchQuery,
  setSearchQuery,
  activeTag,
  setActiveTag,
  showPinnedOnly,
  setShowPinnedOnly,
  loadNotes,
} from "./notes-store";
import { setCurrentView, switchMode } from "./config-store";
import { invoke } from "@tauri-apps/api/core";
import NoteItem from "./NoteItem";

export default function Sidebar() {
  const [newContent, setNewContent] = createSignal("");
  const [showSearch, setShowSearch] = createSignal(false);
  let newInputRef!: HTMLInputElement;
  let searchInputRef!: HTMLInputElement;

  onMount(async () => {
    // 窗口获得焦点时刷新笔记列表
    const unlisten = await listen("tauri://focus", async () => {
      await loadNotes();
      newInputRef?.focus();
    });
    onCleanup(() => unlisten());

    // 首次挂载也聚焦输入框 (从居中模式切换过来时)
    newInputRef?.focus();
  });

  /** 新建笔记 */
  async function handleCreate() {
    const raw = newContent().trim();
    if (!raw) return;

    // 提取标签
    const tagRegex = /#([^\s#]+)/g;
    const tags: string[] = [];
    let match;
    while ((match = tagRegex.exec(raw)) !== null) {
      tags.push(match[1]);
    }
    const cleanContent = raw.replace(/#[^\s#]+\s?/g, "").trim();

    await createNote(cleanContent || raw, tags);
    setNewContent("");
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    } else if (e.key === "Escape") {
      getCurrentWindow().hide();
    } else if (e.key === "f" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+F 切换搜索栏并聚焦
      e.preventDefault();
      const willShow = !showSearch();
      setShowSearch(willShow);
      if (willShow) {
        // 等 DOM 更新后聚焦搜索框
        requestAnimationFrame(() => searchInputRef?.focus());
      }
    } else if (e.key === "m" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+M 切换模式
      e.preventDefault();
      switchMode();
    }
  }

  return (
    <div class="sidebar" onKeyDown={handleKeyDown}>
      {/* 顶部标题栏 */}
      <div class="sidebar-header" data-tauri-drag-region>
        <span class="sidebar-title">QuickNote</span>
        <div class="sidebar-actions">
          <button
            class="icon-btn"
            onClick={() => setShowSearch((s) => {
              const willShow = !s;
              if (willShow) requestAnimationFrame(() => searchInputRef?.focus());
              return willShow;
            })}
            title="搜索 (Ctrl+F)"
          >
            {"\uD83D\uDD0D"}
          </button>
          <button
            class="icon-btn"
            onClick={() => switchMode()}
            title="切换到居中模式 (Ctrl+M)"
          >
            {"\u21C4"}
          </button>
          <button
            class="icon-btn"
            onClick={async () => {
              await invoke("set_prevent_hide", { prevent: true });
              setCurrentView("settings");
              await invoke("apply_mode", { mode: "settings" });
            }}
            title="设置"
          >
            {"\u2699"}
          </button>
        </div>
      </div>

      {/* 搜索栏 (可折叠) */}
      <Show when={showSearch()}>
        <div class="sidebar-search">
          <input
            ref={searchInputRef}
            class="search-input"
            placeholder="搜索笔记..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </div>
      </Show>

      {/* 新建笔记输入 */}
      <div class="sidebar-new">
        <input
          ref={newInputRef}
          class="new-input"
          placeholder="+ 新建笔记..."
          value={newContent()}
          onInput={(e) => setNewContent(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
        />
      </div>

      {/* 笔记列表 */}
      <div class="sidebar-list">
        <For each={filteredNotes()} fallback={<div class="empty-hint">暂无笔记</div>}>
          {(note) => <NoteItem note={note} />}
        </For>
      </div>

      {/* 底部: 标签筛选 + 收藏筛选 */}
      <div class="sidebar-filters">
        <button
          class={"filter-btn" + (showPinnedOnly() ? " active" : "")}
          onClick={() => setShowPinnedOnly((v) => !v)}
        >
          {"\u2605"} 收藏
        </button>
        <Show when={activeTag()}>
          <button class="filter-btn active" onClick={() => setActiveTag(null)}>
            #{activeTag()} ✕
          </button>
        </Show>
        <For each={allTags()}>
          {(tag) => (
            <Show when={tag !== activeTag()}>
              <button
                class="filter-btn"
                onClick={() => setActiveTag(tag)}
              >
                #{tag}
              </button>
            </Show>
          )}
        </For>
      </div>
    </div>
  );
}
