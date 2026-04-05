/**
 * 笔记状态管理 —— Solid.js 信号 + Tauri IPC 调用
 *
 * 所有笔记数据在前端内存中维护，通过 IPC 与 Rust 后端同步
 * 搜索/筛选在前端完成 (createMemo 自动响应状态变化)
 */

import { createSignal, createMemo } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

/** 笔记数据结构 (与 Rust 端 Note 结构对应) */
export interface Note {
  id: string;
  created: string;
  tags: string[];
  pinned: boolean;
  content: string;
}

// --- 响应式状态 ---
const [notes, setNotes] = createSignal<Note[]>([]);
const [searchQuery, setSearchQuery] = createSignal("");
const [activeTag, setActiveTag] = createSignal<string | null>(null);
const [showPinnedOnly, setShowPinnedOnly] = createSignal(false);

// --- 计算属性: 根据搜索/标签/置顶条件过滤笔记 ---
export const filteredNotes = createMemo(() => {
  let result = notes();

  // 搜索过滤: 大小写不敏感的内容匹配
  const query = searchQuery().toLowerCase();
  if (query) {
    result = result.filter((n) => n.content.toLowerCase().includes(query));
  }

  // 标签过滤
  const tag = activeTag();
  if (tag) {
    result = result.filter((n) => n.tags.includes(tag));
  }

  // 仅显示收藏
  if (showPinnedOnly()) {
    result = result.filter((n) => n.pinned);
  }

  // 排序: 置顶在前，然后按时间倒序
  return [...result].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.created.localeCompare(a.created);
  });
});

// --- 所有标签列表 (去重) ---
export const allTags = createMemo(() => {
  const tagSet = new Set<string>();
  for (const note of notes()) {
    for (const tag of note.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
});

// --- IPC 操作 ---

/** 从后端加载所有笔记到前端缓存 */
export async function loadNotes() {
  const result = await invoke<Note[]>("get_all_notes");
  setNotes(result);
}

/** 创建新笔记 */
export async function createNote(
  content: string,
  tags: string[],
  pinned: boolean = false
) {
  const note = await invoke<Note>("create_note", { content, tags, pinned });
  setNotes((prev) => [note, ...prev]);
  return note;
}

/** 更新笔记 */
export async function updateNote(
  id: string,
  content: string,
  tags: string[],
  pinned: boolean
) {
  const note = await invoke<Note>("update_note", { id, content, tags, pinned });
  setNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
  return note;
}

/** 删除笔记 */
export async function deleteNote(id: string) {
  await invoke("delete_note_cmd", { id });
  setNotes((prev) => prev.filter((n) => n.id !== id));
}

// 导出 getter/setter 供组件使用
export {
  notes,
  searchQuery,
  setSearchQuery,
  activeTag,
  setActiveTag,
  showPinnedOnly,
  setShowPinnedOnly,
};
