/**
 * 笔记卡片组件 —— 在侧边栏列表中展示单条笔记
 *
 * 点击展开编辑，支持修改内容/标签、切换置顶、删除
 */

import { createSignal, Show } from "solid-js";
import { Note, updateNote, deleteNote } from "./notes-store";

interface Props {
  note: Note;
}

export default function NoteItem(props: Props) {
  const [expanded, setExpanded] = createSignal(false);
  const [editContent, setEditContent] = createSignal(props.note.content);
  const [editTags, setEditTags] = createSignal(props.note.tags.join(", "));

  /** 保存编辑 */
  async function handleSave() {
    const tags = editTags()
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    await updateNote(props.note.id, editContent(), tags, props.note.pinned);
    setExpanded(false);
  }

  /** 切换置顶 */
  async function handleTogglePin() {
    await updateNote(
      props.note.id,
      props.note.content,
      props.note.tags,
      !props.note.pinned
    );
  }

  /** 删除笔记 */
  async function handleDelete() {
    await deleteNote(props.note.id);
  }

  /** 格式化时间: "2026-04-05T14:30:52" → "04-05 14:30" */
  function formatTime(created: string): string {
    return created.slice(5, 16).replace("T", " ");
  }

  return (
    <div class={"note-item" + (expanded() ? " expanded" : "")}>
      {/* 折叠状态: 显示摘要 */}
      <div class="note-header" onClick={() => setExpanded(!expanded())}>
        <div class="note-title-row">
          <span class="note-title">
            {props.note.pinned && <span class="pin-icon">{"\u2605"} </span>}
            {props.note.content.slice(0, 30)}
            {props.note.content.length > 30 ? "..." : ""}
          </span>
          <span class="note-time">{formatTime(props.note.created)}</span>
        </div>
        <Show when={props.note.tags.length > 0}>
          <div class="note-tags">
            {props.note.tags.map((tag) => (
              <span class="note-tag">#{tag}</span>
            ))}
          </div>
        </Show>
      </div>

      {/* 展开状态: 编辑区域 */}
      <Show when={expanded()}>
        <div class="note-edit">
          <textarea
            class="note-edit-input"
            value={editContent()}
            onInput={(e) => setEditContent(e.currentTarget.value)}
          />
          <input
            class="note-edit-tags"
            placeholder="标签 (逗号分隔)"
            value={editTags()}
            onInput={(e) => setEditTags(e.currentTarget.value)}
          />
          <div class="note-actions">
            <button class="btn-save" onClick={handleSave}>保存</button>
            <button class="btn-pin" onClick={handleTogglePin}>
              {props.note.pinned ? "取消置顶" : "置顶"}
            </button>
            <button class="btn-delete" onClick={handleDelete}>删除</button>
          </div>
        </div>
      </Show>
    </div>
  );
}
