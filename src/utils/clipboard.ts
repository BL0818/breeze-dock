// ============================================================
// 剪贴板工具函数
// ============================================================

/**
 * 复制纯文本到剪贴板
 *
 * 优先使用 Clipboard API，降级使用 document.execCommand
 *
 * @param text 要复制的文本
 * @returns 是否成功
 */
export async function copyPlainText(text: string): Promise<boolean> {
  // 尝试 Clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 降级处理
    }
  }

  // 降级方案：使用 textarea + execCommand
  return fallbackCopy(text);
}

/**
 * 复制 Markdown 格式文本
 *
 * 将笔记标题和内容组合为 Markdown 格式后复制
 *
 * @param title 笔记标题
 * @param content 笔记内容
 * @returns 是否成功
 */
export async function copyAsMarkdown(
  title: string,
  content: string,
): Promise<boolean> {
  const md = title ? `# ${title}\n\n${content}` : content;
  return copyPlainText(md);
}

/**
 * 复制带格式的富文本到剪贴板
 *
 * 使用 Clipboard API 的 write 方法同时写入纯文本和 HTML 格式
 *
 * @param text 纯文本内容
 * @param html HTML 格式内容
 * @returns 是否成功
 */
export async function copyRichText(
  text: string,
  html: string,
): Promise<boolean> {
  if (navigator.clipboard?.write) {
    try {
      const textBlob = new Blob([text], { type: 'text/plain' });
      const htmlBlob = new Blob([html], { type: 'text/html' });

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob,
        }),
      ]);
      return true;
    } catch {
      // 降级为纯文本
      return copyPlainText(text);
    }
  }

  return copyPlainText(text);
}

/**
 * 复制图片到剪贴板
 *
 * @param imageBlob 图片的 Blob 数据
 * @returns 是否成功
 */
export async function copyImage(imageBlob: Blob): Promise<boolean> {
  if (navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          [imageBlob.type]: imageBlob,
        }),
      ]);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// ============================================================
// 内部工具
// ============================================================

/** 降级复制方案 */
function fallbackCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    success = false;
  } finally {
    document.body.removeChild(textarea);
  }

  return success;
}
