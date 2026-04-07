// ============================================================
// BrLinkDetector - URL 自动检测工具函数
// ============================================================

export interface DetectedLink {
  url: string;
  startIndex: number;
  endIndex: number;
}

// URL 正则表达式 - 检测 http, https, ftp 等协议
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

/**
 * 检测文本中的所有 URL
 * @param text 输入文本
 * @returns URL 数组及其位置信息
 */
export function detectLinks(text: string): DetectedLink[] {
  if (!text) return [];

  const links: DetectedLink[] = [];
  let match: RegExpExecArray | null;

  // 使用正则检测 URL
  while ((match = URL_REGEX.exec(text)) !== null) {
    links.push({
      url: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return links;
}

/**
 * 将文本分割为普通文本段和链接段
 * @param text 输入文本
 * @returns 分割后的片段数组
 */
export interface TextSegment {
  type: 'text' | 'link';
  content: string;
}

export function splitTextWithLinks(text: string): TextSegment[] {
  if (!text) return [];

  const links = detectLinks(text);
  if (links.length === 0) {
    return [{ type: 'text', content: text }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const link of links) {
    // 添加链接前的普通文本
    if (link.startIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, link.startIndex),
      });
    }

    // 添加链接
    segments.push({
      type: 'link',
      content: link.url,
    });

    lastIndex = link.endIndex;
  }

  // 添加最后剩余的普通文本
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}
