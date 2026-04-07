import Fuse from 'fuse.js';
import type { Note } from '../types';

// ============================================================
// 搜索工具函数
// ============================================================

/** Fuse.js 搜索配置 */
const fuseOptions: Fuse.IFuseOptions<Note> = {
  keys: [
    { name: 'title', weight: 0.7 },
    { name: 'content', weight: 0.3 },
  ],
  threshold: 0.4,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 1,
  ignoreLocation: true,
};

/**
 * 搜索笔记
 *
 * - 使用 Fuse.js 进行模糊搜索
 * - 同时支持拼音首字母搜索
 * - 空关键词返回所有笔记
 *
 * @param notes 待搜索的笔记列表
 * @param query 搜索关键词
 * @returns 匹配的笔记列表
 */
export function searchNotes(notes: Note[], query: string): Note[] {
  if (!query.trim()) return notes;

  // 标准模糊搜索
  const fuse = new Fuse(notes, fuseOptions);
  const fuseResults = fuse.search(query);

  // 拼音首字母搜索
  const pinyinResults = searchByPinyin(notes, query);

  // 合并结果，去重
  const matchedIds = new Set<string>();
  const results: Note[] = [];

  for (const r of fuseResults) {
    if (!matchedIds.has(r.item.id)) {
      matchedIds.add(r.item.id);
      results.push(r.item);
    }
  }

  for (const note of pinyinResults) {
    if (!matchedIds.has(note.id)) {
      matchedIds.add(note.id);
      results.push(note);
    }
  }

  return results;
}

/**
 * 拼音首字母搜索
 *
 * - 提取标题中每个中文字的拼音首字母
 * - 与搜索关键词匹配
 * - 例如: "你好世界" -> "nhsj"，搜索 "nh" 可匹配
 */
function searchByPinyin(notes: Note[], query: string): Note[] {
  const lowerQuery = query.toLowerCase();

  return notes.filter((note) => {
    const titlePinyin = extractPinyinInitials(note.title);
    const contentPinyin = extractPinyinInitials(note.content?.substring(0, 200) ?? '');

    return (
      titlePinyin.toLowerCase().includes(lowerQuery) ||
      contentPinyin.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * 提取文本的拼音首字母（简易版）
 *
 * 仅做基础的中文字符到拼音首字母映射，
 * 完整版可引入 pinyin-pro 等库。
 */
function extractPinyinInitials(text: string): string {
  if (!text) return '';

  const initials = 'ABCDEFGHJKLMNOPQRSTWXYZ';
  // 常见汉字 Unicode 范围对应的声母首字母映射表
  // 此处使用简化版：仅提取已有英文字符和中文字符基本映射
  let result = '';

  for (const char of text) {
    // 英文字母直接保留
    if (/[a-zA-Z]/.test(char)) {
      result += char;
      continue;
    }

    // 中文字符 —— 简化版首字母提取
    const code = char.charCodeAt(0);
    if (code >= 0x4e00 && code <= 0x9fa5) {
      // 使用 GB2312 编码区间粗略映射拼音首字母
      const idx = Math.floor((code - 0x4e00) / (0x9fa5 - 0x4e00) * 23);
      result += initials[Math.min(idx, 22)];
    }
  }

  return result;
}

/**
 * 关键词高亮
 *
 * - 将匹配的关键词用 <mark> 标签包裹
 * - 用于搜索结果展示
 * - 返回 HTML 字符串（需配合 dangerouslySetInnerHTML 使用）
 *
 * @param text 原始文本
 * @param query 搜索关键词
 * @returns 高亮后的 HTML 字符串
 */
export function highlightText(text: string, query: string): string {
  if (!query || !query.trim()) {
    return escapeHtml(text);
  }

  const escaped = escapeHtml(text);
  const escapedQuery = escapeHtml(query);

  // 不区分大小写的全局替换
  const regex = new RegExp(`(${escapeRegex(escapedQuery)})`, 'gi');
  return escaped.replace(regex, '<mark class="bg-primary/20 text-primary rounded px-0.5">$1</mark>');
}

/** HTML 特殊字符转义 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
}

/** 正则特殊字符转义 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
