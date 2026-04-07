import React, { useMemo, useCallback } from 'react';
import { useNoteStore } from '../../stores/useNoteStore';
import BrProgressBar from './BrProgressBar';
import { Check } from 'lucide-react';

// ============================================================
// BrTodoList - Markdown 待办清单渲染组件
// 支持 - [ ] 未完成 / - [x] 已完成 格式
// ============================================================

export interface BrTodoListProps {
  noteId: string;
  content: string;
}

interface ParsedTodo {
  id: string;
  text: string;
  completed: boolean;
  raw: string;
}

const TODO_LINE_REGEX = /^(\s*)-\s*\[([ xX])\]\s*(.+)$/gm;

/**
 * 解析 Markdown 内容中的待办项
 */
function parseTodos(content: string): ParsedTodo[] {
  const todos: ParsedTodo[] = [];
  let match: RegExpExecArray | null;

  while ((match = TODO_LINE_REGEX.exec(content)) !== null) {
    const [, _indent, checkbox, text] = match;
    todos.push({
      id: `todo-${match.index}`,
      text: text.trim(),
      completed: checkbox.toLowerCase() === 'x',
      raw: match[0],
    });
  }

  return todos;
}

/**
 * 替换指定位置的待办行为新的完成状态
 */
function toggleTodoInContent(
  content: string,
  todoId: string,
  completed: boolean,
): string {
  const todos = parseTodos(content);
  const targetIndex = todos.findIndex((t) => t.id === todoId);
  if (targetIndex === -1) return content;

  const target = todos[targetIndex];
  const indent = target.raw.match(/^(\s*)/)?.[1] ?? '';
  const newLine = `${indent}- [${completed ? 'x' : ' '}] ${target.text}`;
  const escapedRaw = target.raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapedRaw.replace(/\\\s\*\\\[\^?/, '\\[.?')}`, 'm');
  return content.replace(regex, newLine);
}

const BrTodoList: React.FC<BrTodoListProps> = ({ noteId, content }) => {
  const updateNote = useNoteStore((s) => s.updateNote);

  const todos = useMemo(() => parseTodos(content), [content]);
  const completedCount = useMemo(
    () => todos.filter((t) => t.completed).length,
    [todos],
  );
  const totalCount = todos.length;

  const handleToggle = useCallback(
    (todoId: string, currentCompleted: boolean) => {
      const newContent = toggleTodoInContent(content, todoId, !currentCompleted);
      updateNote(noteId, { content: newContent });
    },
    [noteId, content, updateNote],
  );

  // 无待办时显示提示
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center mb-3">
          <Check className="w-5 h-5 text-gray-600" />
        </div>
        <p className="text-[13px] text-gray-500">暂无待办事项</p>
        <p className="text-[12px] text-gray-600 mt-1">
          输入 <code className="px-1 py-0.5 bg-[#2E2E2E] rounded text-[11px]">- [ ] 待办内容</code> 添加
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 进度统计 */}
      <BrProgressBar completed={completedCount} total={totalCount} />

      {/* 待办列表 */}
      <div className="flex flex-col gap-1">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================
// TodoItem - 单个待办项
// ============================================================

interface TodoItemProps {
  todo: ParsedTodo;
  onToggle: (id: string, completed: boolean) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle }) => {
  return (
    <div className="group flex items-start gap-3 py-1.5 px-2 -mx-2 rounded-md cursor-pointer transition-colors duration-150 hover:bg-[#1A1A1A]"
      onClick={() => onToggle(todo.id, todo.completed)}
    >
      {/* 自定义复选框 */}
      <div
        className={`
          w-4.5 h-4.5 rounded-sm shrink-0 mt-0.5 flex items-center justify-center
          transition-all duration-150 border
          ${todo.completed
            ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
            : 'border-gray-600 hover:border-[var(--color-primary)]'
          }
        `}
      >
        {todo.completed && <Check className="w-3 h-3 text-white" strokeWidth={2.5} />}
      </div>

      {/* 文字 */}
      <span
        className={`
          text-[14px] leading-relaxed transition-colors duration-150
          ${todo.completed
            ? 'text-gray-500 line-through'
            : 'text-gray-200'
          }
          group-hover:text-gray-100
        `}
      >
        {todo.text}
      </span>
    </div>
  );
};

export default BrTodoList;
