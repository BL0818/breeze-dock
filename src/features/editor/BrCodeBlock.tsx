import React, { useMemo, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
// 导入常用语言
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';
import xml from 'highlight.js/lib/languages/xml'; // HTML
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash';
import yaml from 'highlight.js/lib/languages/yaml';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import swift from 'highlight.js/lib/languages/swift';
import kotlin from 'highlight.js/lib/languages/kotlin';
import dockerfile from 'highlight.js/lib/languages/dockerfile';

// 注册语言
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('rs', rust);
hljs.registerLanguage('go', go);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('java', java);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('rb', ruby);
hljs.registerLanguage('php', php);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('kt', kotlin);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('docker', dockerfile);

// 语言别名映射
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rs: 'rust',
  md: 'markdown',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  rb: 'ruby',
  kt: 'kotlin',
  docker: 'dockerfile',
};

// 语言显示名称
const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  rust: 'Rust',
  go: 'Go',
  html: 'HTML',
  xml: 'XML',
  css: 'CSS',
  json: 'JSON',
  markdown: 'Markdown',
  bash: 'Bash',
  yaml: 'YAML',
  sql: 'SQL',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  dockerfile: 'Dockerfile',
};

export interface BrCodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

// 规范化语言名称
function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[lower] || lower;
}

// 获取语言显示名称
function getLanguageDisplayName(lang: string): string {
  const normalized = normalizeLanguage(lang);
  return LANGUAGE_DISPLAY_NAMES[normalized] || normalized.toUpperCase();
}

// 检查语言是否支持
function isLanguageSupported(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return hljs.getLanguage(normalized) !== undefined;
}

const BrCodeBlock: React.FC<BrCodeBlockProps> = ({
  code,
  language = 'plaintext',
  showLineNumbers = false,
  className = '',
}) => {
  const codeRef = useRef<HTMLElement>(null);
  const normalizedLang = normalizeLanguage(language);
  const isSupported = isLanguageSupported(language);

  // 高亮代码
  const highlightedCode = useMemo(() => {
    if (!isSupported) {
      // 不支持的语言，原样返回并转义 HTML
      return code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    try {
      const result = hljs.highlight(code, { language: normalizedLang });
      return result.value;
    } catch {
      return code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }, [code, normalizedLang, isSupported]);

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // 代码行
  const lines = code.split('\n');

  return (
    <div
      className={`relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}
      style={{ backgroundColor: '#1e1e1e' }}
    >
      {/* 顶部栏 - 语言标签和操作按钮 */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-gray-700"
        style={{ backgroundColor: '#252526' }}
      >
        {/* 语言标签 */}
        <span
          className="text-xs font-medium px-2 py-0.5 rounded"
          style={{ backgroundColor: '#3c3c3c', color: '#cccccc' }}
        >
          {getLanguageDisplayName(language)}
        </span>

        {/* 操作按钮 */}
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded hover:bg-gray-700"
          style={{ color: '#cccccc' }}
          title="复制代码"
        >
          复制
        </button>
      </div>

      {/* 代码区域 */}
      <div className="relative overflow-x-auto">
        <div className="flex">
          {/* 行号 */}
          {showLineNumbers && (
            <div
              className="flex-shrink-0 py-3 px-3 text-right select-none border-r border-gray-700"
              style={{ backgroundColor: '#1e1e1e', color: '#858585' }}
            >
              {lines.map((_, index) => (
                <div key={index} className="text-xs leading-6 font-mono">
                  {index + 1}
                </div>
              ))}
            </div>
          )}

          {/* 代码 */}
          <pre
            className="flex-1 p-3 overflow-x-auto"
            style={{ backgroundColor: '#1e1e1e', margin: 0 }}
          >
            <code
              ref={codeRef}
              className={`text-sm leading-6 font-mono ${isSupported ? `language-${normalizedLang}` : ''}`}
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>
        </div>
      </div>

      {/* highlight.js 样式 - synthwave84 风格 */}
      <style>{`
        /* synthwave84 inspired theme for dark mode */
        .hljs {
          color: #f92aad;
          background: #1e1e1e;
        }
        .hljs-comment,
        .hljs-quote {
          color: #868686;
          font-style: italic;
        }
        .hljs-keyword,
        .hljs-selector-tag {
          color: #ff6ed9;
        }
        .hljs-string,
        .hljs-attr {
          color: #65c3ba;
        }
        .hljs-number,
        .hljs-literal {
          color: #ff6e40;
        }
        .hljs-variable,
        .hljs-template-variable {
          color: #f92aad;
        }
        .hljs-title,
        .hljs-section {
          color: #01cdfe;
          font-weight: bold;
        }
        .hljs-type,
        .hljs-built_in,
        .hljs-class .hljs-title {
          color: #01cdfe;
        }
        .hljs-tag {
          color: #ff6ed9;
        }
        .hljs-name {
          color: #65c3ba;
        }
        .hljs-attribute {
          color: #ff6e40;
        }
        .hljs-function {
          color: #b967fe;
        }
        .hljs-params {
          color: #ffcc6f;
        }
        .hljs-meta {
          color: #ff6e40;
        }
        .hljs-regexp {
          color: #65c3ba;
        }
        .hljs-symbol {
          color: #01cdfe;
        }
        .hljs-bullet {
          color: #ff6e40;
        }
        .hljs-link {
          color: #b967fe;
          text-decoration: underline;
        }
        .hljs-deletion {
          color: #ff6e40;
          background-color: rgba(255, 110, 64, 0.2);
        }
        .hljs-addition {
          color: #65c3ba;
          background-color: rgba(101, 195, 186, 0.2);
        }
        .hljs-emphasis {
          font-style: italic;
        }
        .hljs-strong {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default BrCodeBlock;
