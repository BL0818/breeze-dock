import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useNoteStore } from '../../stores/useNoteStore';
import { useTagStore } from '../../stores/useTagStore';
import { useGroupStore } from '../../stores/useGroupStore';
import { useSettingStore } from '../../stores/useSettingStore';
import { useAutoSave } from '../../hooks/useAutoSave';
import { countWords, estimateReadingTime, formatDate } from '../../utils/format';
import { TagInput } from '@/components/ui/tag-input';
import BrEditorToolbar from './BrEditorToolbar';
import BrTodoList from './BrTodoList';
import { BrContentEditor } from './BrContentRenderer';
import { Combobox } from '@/components/ui/combobox';
import { BrContextMenu } from '@/components/ui/BrContextMenu';
import { Pencil, Tag as TagIcon, Folder } from 'lucide-react';
import type { ContextMenuItem } from '@/types';
import { detectLinks } from './BrLinkDetector';

// ============================================================
// BrEditor - Linear 极简风格笔记编辑器
// 集成工具栏 + 自动保存 + 标签管理 + 状态栏
// ============================================================

const BrEditor: React.FC = () => {
  const currentNoteId = useNoteStore((s) => s.currentNoteId);
  const notes = useNoteStore((s) => s.notes);
  const updateNote = useNoteStore((s) => s.updateNote);
  const addNoteTag = useNoteStore((s) => s.addNoteTag);
  const removeNoteTag = useNoteStore((s) => s.removeNoteTag);
  const moveNoteToGroup = useNoteStore((s) => s.moveNoteToGroup);

  const tags = useTagStore((s) => s.tags);
  const createTag = useTagStore((s) => s.createTag);

  const groups = useGroupStore((s) => s.groups);

  const fontSize = useSettingStore((s) => s.settings.fontSize);
  const titleRef = useRef<HTMLInputElement>(null);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    items: [] as ContextMenuItem[],
  });

  const currentNote = useMemo(
    () => notes.find((n) => n.id === currentNoteId) ?? null,
    [notes, currentNoteId],
  );

  // 获取当前笔记的标签
  const currentNoteTags = useMemo(() => {
    if (!currentNote) return [];
    return tags.filter((tag) => currentNote.tags?.includes(tag.id));
  }, [currentNote, tags]);

  // 自动保存 hook
  useAutoSave();

  // 切换笔记时自动聚焦标题输入框
  useEffect(() => {
    if (currentNote && titleRef.current) {
      titleRef.current.focus();
    }
  }, [currentNoteId]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!currentNoteId) return;
      updateNote(currentNoteId, { title: e.target.value });
    },
    [currentNoteId, updateNote],
  );

  const handleContentChange = useCallback(
    (content: string) => {
      if (!currentNoteId) return;
      updateNote(currentNoteId, { content });
    },
    [currentNoteId, updateNote],
  );

  // 处理添加标签
  const handleAddTag = useCallback(
    (tagId: string) => {
      if (!currentNoteId) return;
      addNoteTag(currentNoteId, tagId);
    },
    [currentNoteId, addNoteTag],
  );

  // 处理创建新标签
  const handleCreateTag = useCallback(
    (name: string, color: string) => {
      if (!currentNoteId) return;
      createTag(name, color).then((tag) => {
        if (tag) {
          addNoteTag(currentNoteId, tag.id);
        }
      });
    },
    [currentNoteId, createTag, addNoteTag],
  );

  // 处理移除标签
  const handleRemoveTag = useCallback(
    (tagId: string) => {
      if (!currentNoteId) return;
      removeNoteTag(currentNoteId, tagId);
    },
    [currentNoteId, removeNoteTag],
  );

  // 处理更改分组
  const handleGroupChange = useCallback(
    (groupId: string) => {
      if (!currentNoteId) return;
      const newGroupId = groupId === 'none' ? null : groupId;
      moveNoteToGroup(currentNoteId, newGroupId);
    },
    [currentNoteId, moveNoteToGroup],
  );

  // 构建分组选项
  const groupOptions = useMemo(
    () => [
      { value: 'none', label: '无分组', icon: <Folder className="w-4 h-4 text-gray-400" /> },
      ...groups.map((group) => ({
        value: group.id,
        label: group.name,
        icon: <Folder className="w-4 h-4 text-gray-400" />,
      })),
    ],
    [groups]
  );

  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  // 在光标位置插入文本
  const insertTextAtCursor = useCallback((text: string) => {
    const textarea = document.activeElement as HTMLTextAreaElement;
    if (!textarea || textarea.tagName !== 'TEXTAREA') return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = textarea.value;
    const newContent = currentContent.substring(0, start) + text + currentContent.substring(end);

    if (currentNoteId) {
      updateNote(currentNoteId, { content: newContent });
    }

    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  }, [currentNoteId, updateNote]);

  // 右键菜单 - 文本选中时
  const handleTextContextMenu = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const hasSelection = textarea.selectionStart !== textarea.selectionEnd;

      if (hasSelection) {
        const items: ContextMenuItem[] = [
          { label: '复制', icon: 'copy', shortcut: 'Ctrl+C', onClick: () => document.execCommand('copy') },
          { label: '剪切', icon: 'cut', shortcut: 'Ctrl+X', onClick: () => document.execCommand('cut') },
          { label: '粘贴', icon: 'paste', shortcut: 'Ctrl+V', onClick: () => document.execCommand('paste') },
          { divider: true, label: '' },
          {
            label: '更多操作',
            icon: 'more',
            children: [
              { label: '加粗', shortcut: 'Ctrl+B', onClick: () => document.execCommand('bold') },
              { label: '斜体', shortcut: 'Ctrl+I', onClick: () => document.execCommand('italic') },
            ],
          },
        ];
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, items });
      }
    },
    []
  );

  // 右键菜单 - 空白区域
  const handleEditorContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // 检查是否点击在文本选中区域
      const selection = window.getSelection();
      const hasSelection = selection && selection.toString().length > 0;

      if (!hasSelection) {
        e.preventDefault();
        const items: ContextMenuItem[] = [
          {
            label: '插入',
            icon: 'calendar',
            children: [
              { label: '标题 1', onClick: () => insertTextAtCursor('# ') },
              { label: '标题 2', onClick: () => insertTextAtCursor('## ') },
              { label: '标题 3', onClick: () => insertTextAtCursor('### ') },
              { divider: true, label: '' },
              { label: '无序列表', onClick: () => insertTextAtCursor('- ') },
              { label: '有序列表', onClick: () => insertTextAtCursor('1. ') },
              { label: '待办事项', onClick: () => insertTextAtCursor('- [ ] ') },
              { label: '分隔线', onClick: () => insertTextAtCursor('\n---\n') },
            ],
          },
          { divider: true, label: '' },
          { label: '撤销', icon: 'copy', shortcut: 'Ctrl+Z', onClick: () => document.execCommand('undo'), disabled: false },
          { label: '重做', icon: 'paste', shortcut: 'Ctrl+Y', onClick: () => document.execCommand('redo'), disabled: false },
          { divider: true, label: '' },
          { label: '全选', shortcut: 'Ctrl+A', onClick: selectAllContent },
        ];
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, items });
      }
    },
    [insertTextAtCursor]
  );

  // 全选内容
  const selectAllContent = useCallback(() => {
    const textarea = document.activeElement as HTMLTextAreaElement;
    if (textarea && textarea.tagName === 'TEXTAREA') {
      textarea.select();
    }
  }, []);

  // 点击编辑区空白处聚焦 textarea
  const handleContentAreaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // 如果点击的是标题输入框或标签区域，不抢焦点
      if (e.target === titleRef.current) return;
      if ((e.target as HTMLElement).closest('.tag-input-area')) return;
      // 聚焦当前活跃的 textarea
      const textarea = document.activeElement as HTMLTextAreaElement;
      if (textarea && textarea.tagName === 'TEXTAREA') {
        textarea.focus();
      }
    },
    [],
  );

  // 自动链接：将纯文本 URL 转换为 markdown 链接格式
  const autoLinkContent = useCallback((content: string): string => {
    const links = detectLinks(content);
    if (links.length === 0) return content;

    let result = '';
    let lastIndex = 0;

    for (const link of links) {
      // 添加链接前的文本
      if (link.startIndex > lastIndex) {
        result += content.slice(lastIndex, link.startIndex);
      }
      // 检查是否已经被 markdown 链接包裹
      const beforeLink = content.slice(Math.max(0, link.startIndex - 1), link.startIndex);
      const afterLink = content.slice(link.endIndex, Math.min(content.length, link.endIndex + 1));
      const isAlreadyLinked = beforeLink === '[' && afterLink === ')';

      if (isAlreadyLinked) {
        // 已经是链接，保持原样
        result += content.slice(link.startIndex, link.endIndex);
      } else {
        // 转换为 markdown 链接
        result += `[${link.url}](${link.url})`;
      }
      lastIndex = link.endIndex;
    }

    // 添加剩余文本
    if (lastIndex < content.length) {
      result += content.slice(lastIndex);
    }

    return result;
  }, []);

  // 空状态 - Linear 风格
  if (!currentNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#141414]">
        <div className="flex flex-col items-center gap-4">
          {/* 图标 */}
          <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-[#1A1A1A] flex items-center justify-center">
            <Pencil className="w-6 h-6 text-gray-300 dark:text-gray-700" />
          </div>

          {/* 文字提示 */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-[15px] font-medium text-gray-800 dark:text-gray-200">
              选择或创建一篇笔记
            </p>
            <p className="text-[13px] text-gray-500">
              在左侧点击笔记或新建笔记开始编辑
            </p>
          </div>
        </div>
      </div>
    );
  }

  const wordCount = countWords(currentNote.content);
  const readingTime = estimateReadingTime(currentNote.content);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 编辑器工具栏 */}
      <BrEditorToolbar noteId={currentNote.id} />

      {/* 编辑器内容 - 点击空白聚焦 */}
      <div
        className="flex-1 overflow-y-auto cursor-text relative w-full"
        onClick={handleContentAreaClick}
        onContextMenu={handleEditorContextMenu}
      >
        <div
          className="w-full mx-auto px-8 py-8"
          style={{ minHeight: 300, minWidth: 500 }}
        >
          {/* 标题输入 */}
          <input
            ref={titleRef}
            type="text"
            value={currentNote.title}
            onChange={handleTitleChange}
            placeholder="标题"
            className="block w-full bg-white dark:bg-[#1A1A1A] text-[16px] font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none mb-4 cursor-text border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
          />

          {/* 分组选择区域 */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Folder className="w-4 h-4 text-gray-400" />
              <span className="text-[13px] text-gray-500">分组</span>
            </div>
            <Combobox
              options={groupOptions}
              value={currentNote.groupId || 'none'}
              onValueChange={handleGroupChange}
              placeholder="选择分组"
              searchPlaceholder="搜索分组..."
              emptyText="未找到分组"
            />
          </div>

          {/* 标签输入区域 */}
          <div className="tag-input-area mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TagIcon className="w-4 h-4 text-gray-400" />
              <span className="text-[13px] text-gray-500">标签</span>
            </div>
            <TagInput
              tags={currentNoteTags}
              availableTags={tags}
              onAdd={handleAddTag}
              onCreate={handleCreateTag}
              onRemove={handleRemoveTag}
              placeholder="添加标签..."
            />
          </div>

          {/* 内容输入 - 填满剩余空间 */}
          {currentNote.template === 'todo' ? (
            <BrTodoList noteId={currentNote.id} content={currentNote.content} />
          ) : (
            <BrContentEditor
              content={autoLinkContent(currentNote.content)}
              onChange={handleContentChange}
              onContextMenu={handleTextContextMenu}
              placeholder="开始记录..."
              className="h-[calc(100vh-280px)] min-h-[300px] border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
              style={{ fontSize, lineHeight: 1.7 }}
            />
          )}
        </div>
      </div>

      {/* 底部状态栏 - Linear 风格 */}
      <div className="flex items-center justify-between px-6 py-2.5 border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] text-[12px] text-gray-500">
        <div className="flex items-center gap-4">
          <span>{wordCount} 字</span>
          <span>{readingTime}</span>
        </div>
        <span>{formatDate(currentNote.updatedAt)}</span>
      </div>

      {/* 右键菜单 */}
      <BrContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        items={contextMenu.items}
        onClose={closeContextMenu}
      />
    </div>
  );
};

export default BrEditor;
