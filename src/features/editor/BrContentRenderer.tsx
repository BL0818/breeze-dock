import React, { useMemo } from 'react';
import BrCodeBlock from './BrCodeBlock';

export interface BrContentRendererProps {
  content: string;
  className?: string;
}

/**
 * 解析 Markdown 代码块
 * 支持 ```language 和 ``` 两种格式
 */
interface CodeBlock {
  type: 'code';
  language: string;
  code: string;
}

interface TextBlock {
  type: 'text';
  content: string;
}

type ContentBlock = CodeBlock | TextBlock;

/**
 * 解析内容中的代码块
 * 匹配 ```language 或 ``` 开头的代码块
 */
function parseContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // 正则匹配 ```language 或 ``` 开头的代码块
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // 添加代码块之前的文本
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index);
      if (textContent.trim()) {
        blocks.push({
          type: 'text',
          content: textContent,
        });
      }
    }

    // 添加代码块
    const language = match[1] || 'plaintext';
    const code = match[2];
    blocks.push({
      type: 'code',
      language,
      code: code.replace(/\n$/, ''), // 移除末尾换行
    });

    lastIndex = match.index + match[0].length;
  }

  // 添加剩余文本
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent.trim()) {
      blocks.push({
        type: 'text',
        content: textContent,
      });
    }
  }

  return blocks;
}

/**
 * 渲染纯文本，支持基本 Markdown 格式
 */
function renderTextContent(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  lines.forEach((line, _lineIndex) => {
    // 检测标题
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key++} className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 mt-4 first:mt-0">
          {renderInlineMarkdown(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 mt-4 first:mt-0">
          {renderInlineMarkdown(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-3 first:mt-0">
          {renderInlineMarkdown(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={key++} className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-3 first:mt-0">
          {renderInlineMarkdown(line.slice(5))}
        </h4>
      );
    }
    // 检测无序列表
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key++} className="flex items-start gap-2 py-0.5">
          <span className="text-gray-400 mt-1.5">•</span>
          <span className="text-gray-800 dark:text-gray-200 flex-1">
            {renderInlineMarkdown(line.slice(2))}
          </span>
        </div>
      );
    }
    // 检测有序列表
    else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={key++} className="flex items-start gap-2 py-0.5">
            <span className="text-gray-400 min-w-[1.5em]">{match[1]}.</span>
            <span className="text-gray-800 dark:text-gray-200 flex-1">
              {renderInlineMarkdown(match[2])}
            </span>
          </div>
        );
      }
    }
    // 检测待办事项
    else if (line.startsWith('- [ ] ') || line.startsWith('* [ ] ')) {
      const todoText = line.slice(6);
      elements.push(
        <div key={key++} className="flex items-start gap-2 py-0.5">
          <input
            type="checkbox"
            className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary cursor-pointer"
            disabled
          />
          <span className="text-gray-800 dark:text-gray-200 flex-1">
            {renderInlineMarkdown(todoText)}
          </span>
        </div>
      );
    }
    else if (line.startsWith('- [x] ') || line.startsWith('- [X] ') || line.startsWith('* [x] ') || line.startsWith('* [X] ')) {
      const todoText = line.slice(6);
      elements.push(
        <div key={key++} className="flex items-start gap-2 py-0.5">
          <input
            type="checkbox"
            className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary cursor-pointer"
            checked
            disabled
          />
          <span className="text-gray-500 dark:text-gray-400 flex-1 line-through">
            {renderInlineMarkdown(todoText)}
          </span>
        </div>
      );
    }
    // 检测分隔线
    else if (line.match(/^[-*_]{3,}$/)) {
      elements.push(
        <hr key={key++} className="my-3 border-gray-200 dark:border-gray-700" />
      );
    }
    // 空行
    else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />);
    }
    // 普通文本
    else {
      elements.push(
        <p key={key++} className="text-gray-800 dark:text-gray-200 leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    }
  });

  return elements;
}

/**
 * 渲染行内 Markdown 格式
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  // 处理行内代码 `code`
  const codeRegex = /`([^`]+)`/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  let match;
  while ((match = codeRegex.exec(text)) !== null) {
    // 添加匹配之前的文本
    if (match.index > lastIndex) {
      parts.push(renderFormattedText(text.slice(lastIndex, match.index), key));
      key++;
    }
    // 添加行内代码
    parts.push(
      <code
        key={key++}
        className="px-1.5 py-0.5 rounded text-sm font-mono bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400"
      >
        {match[1]}
      </code>
    );
    lastIndex = match.index + match[0].length;
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push(renderFormattedText(text.slice(lastIndex), key));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * 处理加粗、斜体和链接
 */
function renderFormattedText(text: string, baseKey: number): React.ReactNode {
  const elements: React.ReactNode[] = [];
  let key = baseKey;

  // 处理 **bold** 和 *italic* 和 [link](url)
  // 使用正则匹配加粗、斜体和链接
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // 添加之前的文本
    if (match.index > lastIndex) {
      elements.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }

    if (match[2]) {
      // **bold**
      elements.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      elements.push(<em key={key++} className="italic">{match[3]}</em>);
    } else if (match[4]) {
      // _italic_
      elements.push(<em key={key++} className="italic">{match[4]}</em>);
    } else if (match[5] && match[6]) {
      // [link](url)
      elements.push(
        <a
          key={key++}
          href={match[6]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {match[5]}
        </a>
      );
    } else if (match[7]) {
      // `code`
      elements.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded text-sm font-mono bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400"
        >
          {match[7]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    elements.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return elements.length > 0 ? elements : text;
}

/**
 * BrContentRenderer - 混合内容渲染器
 *
 * 支持渲染以下内容：
 * - Markdown 标题 (h1-h4)
 * - Markdown 列表 (有序/无序)
 * - Markdown 待办事项
 * - Markdown 分隔线
 * - 代码块 (```language)
 * - 行内代码 (`code`)
 * - 行内格式 (**bold**, *italic*, _italic_)
 * - 链接 [text](url)
 *
 * 设计思路：
 * - 使用 textarea + 预渲染叠加层方案保持编辑能力
 * - textarea 用于编辑，渲染层用于预览
 * - 检测 ```code``` 格式的代码块并使用 BrCodeBlock 渲染
 */
const BrContentRenderer: React.FC<BrContentRendererProps> = ({
  content,
  className = '',
}) => {
  const blocks = useMemo(() => parseContent(content), [content]);

  return (
    <div className={`space-y-1 ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === 'code') {
          return (
            <BrCodeBlock
              key={index}
              code={block.code}
              language={block.language}
              showLineNumbers={false}
              className="my-3"
            />
          );
        }

        return (
          <div key={index} className="space-y-0.5">
            {renderTextContent(block.content)}
          </div>
        );
      })}
    </div>
  );
};

export default BrContentRenderer;

/**
 * BrContentEditor - 支持编辑的混合内容编辑器
 *
 * 使用 textarea + 预渲染叠加层方案：
 * - textarea 透明覆盖在渲染层上方
 * - 渲染层显示格式化的内容
 * - textarea 捕获用户输入
 *
 * @param content - 内容值
 * @param onChange - 内容变化回调
 * @param placeholder - 占位符
 * @param className - 额外样式
 */
export interface BrContentEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  onContextMenu?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
}

export const BrContentEditor: React.FC<BrContentEditorProps> = ({
  content,
  onChange,
  placeholder = '开始记录...',
  className = '',
  style,
  onContextMenu,
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // 点击空白区域时聚焦 textarea
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 如果点击的不是 textarea 本身，则聚焦 textarea
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('render-layer')) {
      textareaRef.current?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-h-[200px] ${className}`}
      onClick={handleContainerClick}
      style={style}
    >
      {/* 渲染层 - 显示格式化内容（代码块、链接等），在底层 */}
      <div
        className="render-layer absolute inset-0 overflow-y-auto pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <BrContentRenderer content={content || placeholder} />
      </div>

      {/* 编辑层 - textarea 透明覆盖在上层 */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onContextMenu={onContextMenu}
        placeholder={placeholder}
        className="block w-full h-full min-h-[200px] bg-transparent text-transparent caret-gray-900 dark:caret-gray-100 outline-none resize-none leading-relaxed"
        style={{ position: 'absolute', zIndex: 1, lineHeight: 1.7, inset: 0 }}
      />
    </div>
  );
};
