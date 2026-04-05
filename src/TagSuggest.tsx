/**
 * 标签自动补全组件 + 工具函数
 *
 * 当用户输入 # 后，弹出已有标签列表供选择
 * 支持键盘导航 (↑↓ 选择, Enter/Tab 确认, Esc 关闭)
 */

import { createMemo, For, Show } from "solid-js";
import { allTags } from "./notes-store";

/** 检测光标位置是否在 #tag 上下文中 */
export function getTagContext(
  text: string,
  cursorPos: number
): { partial: string; start: number } | null {
  let i = cursorPos - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === "#") {
      // # 前面必须是行首或空格
      if (i > 0 && text[i - 1] !== " " && text[i - 1] !== "\n") return null;
      const partial = text.slice(i + 1, cursorPos);
      return { partial, start: i };
    }
    if (ch === " " || ch === "\n") return null;
    i--;
  }
  return null;
}

/** 获取过滤后的标签建议列表 */
export function getFilteredTags(query: string): string[] {
  const q = query.toLowerCase();
  const tags = allTags();
  if (!q) return tags.slice(0, 8);
  return tags.filter((t) => t.toLowerCase().includes(q)).slice(0, 8);
}

/** 将选中的 tag 插入文本，替换 #partial */
export function insertTag(
  text: string,
  start: number,
  cursorPos: number,
  tag: string
): { newText: string; newCursor: number } {
  const before = text.slice(0, start);
  const after = text.slice(cursorPos);
  const inserted = "#" + tag + " ";
  return {
    newText: before + inserted + after,
    newCursor: start + inserted.length,
  };
}

interface Props {
  query: string;
  visible: boolean;
  activeIndex: number;
  onSelect: (tag: string) => void;
}

export default function TagSuggest(props: Props) {
  const suggestions = createMemo(() => getFilteredTags(props.query));

  return (
    <Show when={props.visible && suggestions().length > 0}>
      <div class="tag-suggest">
        <For each={suggestions()}>
          {(tag, i) => (
            <div
              class={
                "tag-suggest-item" +
                (i() === props.activeIndex ? " active" : "")
              }
              onMouseDown={(e) => {
                e.preventDefault();
                props.onSelect(tag);
              }}
            >
              #{tag}
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}
