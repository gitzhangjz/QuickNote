//! 笔记数据模型 —— 结构体定义、frontmatter 解析/序列化、文件读写
//!
//! 每条笔记是一个 Markdown 文件，格式为:
//!   ---
//!   id: abc123
//!   created: 2026-04-05T14:30:52
//!   tags: [工作, 灵感]
//!   pinned: true
//!   ---
//!   正文内容

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// 单条笔记的完整数据
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Note {
    pub id: String,
    pub created: String,
    pub tags: Vec<String>,
    pub pinned: bool,
    pub content: String,
}

/// 从 Markdown 文件内容解析出 Note 结构
/// 文件格式: YAML-like frontmatter (--- 分隔) + 正文
pub fn parse_note(raw: &str) -> Option<Note> {
    // 按 "---" 分割: ["", frontmatter, body]
    let parts: Vec<&str> = raw.splitn(3, "---").collect();
    if parts.len() < 3 {
        return None;
    }

    let yaml_block = parts[1].trim();
    let content = parts[2].trim().to_string();

    let mut id = String::new();
    let mut created = String::new();
    let mut tags: Vec<String> = Vec::new();
    let mut pinned = false;

    // 逐行解析 frontmatter 的 key: value 对
    for line in yaml_block.lines() {
        let line = line.trim();
        if let Some((key, value)) = line.split_once(": ") {
            match key {
                "id" => id = value.to_string(),
                "created" => created = value.to_string(),
                "tags" => {
                    // 解析 [tag1, tag2] 格式
                    let inner = value.trim_start_matches('[').trim_end_matches(']').trim();
                    if !inner.is_empty() {
                        tags = inner.split(", ").map(|s| s.trim().to_string()).collect();
                    }
                }
                "pinned" => pinned = value == "true",
                _ => {}
            }
        }
    }

    // 必须有 id 和 created 字段才算有效笔记
    if id.is_empty() || created.is_empty() {
        return None;
    }

    Some(Note { id, created, tags, pinned, content })
}

/// 将 Note 序列化为 Markdown 文件内容 (frontmatter + 正文)
pub fn serialize_note(note: &Note) -> String {
    let tags_str = if note.tags.is_empty() {
        "[]".to_string()
    } else {
        format!("[{}]", note.tags.join(", "))
    };

    format!(
        "---\nid: {}\ncreated: {}\ntags: {}\npinned: {}\n---\n{}",
        note.id, note.created, tags_str, note.pinned, note.content
    )
}

/// 生成 6 位随机 ID (小写字母 + 数字)
pub fn generate_id() -> String {
    use rand::Rng;
    let charset = b"abcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::thread_rng();
    (0..6)
        .map(|_| charset[rng.gen_range(0..charset.len())] as char)
        .collect()
}

/// 根据 Note 生成文件名: {日期}_{时间}_{ID}.md
/// 例如: 2026-04-05_143052_a1b2c3.md
pub fn note_filename(note: &Note) -> String {
    // 从 ISO 时间戳 "2026-04-05T14:30:52" 提取日期和时间部分
    // 使用 get() 避免在格式异常时 panic
    let date_part = note.created.get(..10).unwrap_or("0000-00-00");
    let time_part = note.created.get(11..19)
        .unwrap_or("000000")
        .replace(':', "");
    format!("{}_{}_{}.md", date_part, time_part, note.id)
}

/// 从指定目录加载所有笔记文件
pub fn load_all_notes(dir: &Path) -> Vec<Note> {
    let mut notes = Vec::new();
    // 目录不存在时返回空列表
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return notes,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "md") {
            if let Ok(raw) = fs::read_to_string(&path) {
                if let Some(note) = parse_note(&raw) {
                    notes.push(note);
                }
            }
        }
    }
    // 按创建时间倒序排列
    notes.sort_by(|a, b| b.created.cmp(&a.created));
    notes
}

/// 将单条笔记写入指定目录
pub fn save_note(dir: &Path, note: &Note) -> Result<(), String> {
    // 确保目录存在
    fs::create_dir_all(dir).map_err(|e| format!("创建目录失败: {e}"))?;

    // 先删除该 ID 的旧文件 (如果是更新操作)
    let _ = delete_note(dir, &note.id);

    let filename = note_filename(note);
    let filepath = dir.join(filename);
    let content = serialize_note(note);
    fs::write(&filepath, content).map_err(|e| format!("写入文件失败: {e}"))
}

/// 从指定目录删除一条笔记 (按 ID 查找文件)
pub fn delete_note(dir: &Path, id: &str) -> Result<(), String> {
    // 遍历目录找到包含该 ID 的文件并删除
    let entries = fs::read_dir(dir).map_err(|e| format!("读取目录失败: {e}"))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
    // 按文件名后缀精确匹配 ID，避免 ID 碰巧是日期子串时误删
            if name.ends_with(&format!("_{}.md", id)) {
                fs::remove_file(&path).map_err(|e| format!("删除文件失败: {e}"))?;
                return Ok(());
            }
        }
    }
    Err(format!("未找到 ID 为 {} 的笔记文件", id))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_note_basic() {
        let raw = "---\nid: abc123\ncreated: 2026-04-05T14:30:52\ntags: [工作, 灵感]\npinned: true\n---\n这是正文内容";
        let note = parse_note(raw).unwrap();
        assert_eq!(note.id, "abc123");
        assert_eq!(note.created, "2026-04-05T14:30:52");
        assert_eq!(note.tags, vec!["工作", "灵感"]);
        assert_eq!(note.pinned, true);
        assert_eq!(note.content, "这是正文内容");
    }

    #[test]
    fn test_parse_note_empty_tags() {
        let raw = "---\nid: xyz789\ncreated: 2026-04-05T15:00:00\ntags: []\npinned: false\n---\n没有标签的笔记";
        let note = parse_note(raw).unwrap();
        assert!(note.tags.is_empty());
        assert_eq!(note.pinned, false);
    }

    #[test]
    fn test_parse_note_no_frontmatter() {
        let raw = "没有 frontmatter 的纯文本";
        assert!(parse_note(raw).is_none());
    }

    #[test]
    fn test_serialize_note() {
        let note = Note {
            id: "abc123".into(),
            created: "2026-04-05T14:30:52".into(),
            tags: vec!["工作".into(), "灵感".into()],
            pinned: true,
            content: "测试内容".into(),
        };
        let result = serialize_note(&note);
        assert!(result.contains("id: abc123"));
        assert!(result.contains("tags: [工作, 灵感]"));
        assert!(result.contains("pinned: true"));
        assert!(result.contains("测试内容"));
    }

    #[test]
    fn test_generate_id_length_and_charset() {
        let id = generate_id();
        assert_eq!(id.len(), 6);
        assert!(id.chars().all(|c| c.is_ascii_alphanumeric()));
    }

    #[test]
    fn test_note_filename_format() {
        let note = Note {
            id: "abc123".into(),
            created: "2026-04-05T14:30:52".into(),
            tags: vec![],
            pinned: false,
            content: "test".into(),
        };
        let filename = note_filename(&note);
        assert_eq!(filename, "2026-04-05_143052_abc123.md");
    }

    #[test]
    fn test_roundtrip_serialize_parse() {
        let note = Note {
            id: "roundt".into(),
            created: "2026-01-01T00:00:00".into(),
            tags: vec!["test".into()],
            pinned: false,
            content: "roundtrip test".into(),
        };
        let serialized = serialize_note(&note);
        let parsed = parse_note(&serialized).unwrap();
        assert_eq!(note, parsed);
    }
}
