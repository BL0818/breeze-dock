import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 初始化 dayjs 插件
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// ============================================================
// 日期格式化
// ============================================================

/**
 * 格式化日期为友好显示
 *
 * - 今天的笔记显示 HH:mm
 * - 昨天的笔记显示 "昨天"
 * - 今年内的显示 M月D日
 * - 更早的显示 YYYY年M月D日
 */
export function formatDate(dateStr: string): string {
  const d = dayjs(dateStr);
  const now = dayjs();

  if (d.isSame(now, 'day')) return d.format('HH:mm');
  if (d.isSame(now.subtract(1, 'day'), 'day')) return '昨天';
  if (d.isSame(now, 'year')) return d.format('M月D日');
  return d.format('YYYY年M月D日');
}

/**
 * 格式化日期为相对时间
 *
 * 例如: "3分钟前", "2小时前", "1天前"
 */
export function formatRelativeTime(dateStr: string): string {
  return dayjs(dateStr).fromNow();
}

/**
 * 格式化日期为完整格式
 *
 * 例如: "2024年1月15日 14:30"
 */
export function formatFullDate(dateStr: string): string {
  return dayjs(dateStr).format('YYYY年M月D日 HH:mm');
}

// ============================================================
// 字数统计
// ============================================================

/**
 * 统计文本字数
 *
 * - 中文按字计数
 * - 英文按单词计数
 * - 混合内容分别统计
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  // 移除 Markdown 标记符号
  const cleanText = text.replace(/[#*_~`>\[\]()!-]/g, '').trim();

  // 匹配中文字符
  const chineseChars = cleanText.match(/[\u4e00-\u9fa5]/g);
  const chineseCount = chineseChars ? chineseChars.length : 0;

  // 匹配英文单词
  const englishText = cleanText.replace(/[\u4e00-\u9fa5]/g, ' ').trim();
  const englishWords = englishText.split(/\s+/).filter((w) => w.length > 0);
  const englishCount = englishWords.length;

  return chineseCount + englishCount;
}

/**
 * 统计字符数（包含空格）
 */
export function countChars(text: string): number {
  return text.length;
}

// ============================================================
// 阅读时长
// ============================================================

/**
 * 估算阅读时长
 *
 * - 中文阅读速度约 300 字/分钟
 * - 英文阅读速度约 200 词/分钟
 *
 * @returns 格式化后的阅读时长字符串，如 "约 2 分钟"
 */
export function estimateReadingTime(text: string): string {
  if (!text || text.trim().length === 0) return '不到 1 分钟';

  const wordCount = countWords(text);
  const minutes = Math.ceil(wordCount / 250);

  if (minutes <= 1) return '不到 1 分钟';
  if (minutes < 60) return `约 ${minutes} 分钟`;

  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return `约 ${hours} 小时 ${remainMinutes} 分钟`;
}
