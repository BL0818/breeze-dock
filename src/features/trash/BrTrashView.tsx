import React, { useMemo, useCallback } from 'react';
import { useNoteStore } from '../../stores/useNoteStore';
import { Trash2, RotateCcw, Trash, Calendar } from 'lucide-react';
import { formatDate } from '../../utils/format';
import { confirm } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';

// ============================================================
// BrTrashView - Linear 极简风格回收站视图
// 时间轴 UI 实现
// ============================================================

// 时间分组类型
type TimeGroup = 'today' | 'yesterday' | 'thisWeek' | 'older';

interface GroupedNotes {
  label: string;
  key: TimeGroup;
  notes: Note[];
}

// Import Note type
import type { Note } from '../../types';

// 获取笔记的时间分组
const getTimeGroup = (dateStr: string): TimeGroup => {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const noteDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (noteDate.getTime() === today.getTime()) return 'today';
  if (noteDate.getTime() === yesterday.getTime()) return 'yesterday';
  if (noteDate >= weekAgo) return 'thisWeek';
  return 'older';
};

// 获取分组标签
const getGroupLabel = (key: TimeGroup): string => {
  const labels: Record<TimeGroup, string> = {
    today: '今天',
    yesterday: '昨天',
    thisWeek: '本周',
    older: '更早',
  };
  return labels[key];
};

// 时间轴节点组件
const BrTimelineNode: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
  <div className="relative z-10 w-10 h-10 rounded-full bg-white dark:bg-[#141414] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] flex items-center justify-center shadow-sm">
    {icon}
  </div>
);

// 时间轴卡片组件
const BrTimelineCard: React.FC<{
  note: {
    id: string;
    title: string;
    content: string;
    trashedAt: string | null;
    updatedAt: string;
  };
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  isLast: boolean;
}> = ({ note, onRestore, onDelete, isLast }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div className="relative flex items-start gap-4">
      {/* 时间轴线（连接线） */}
      {!isLast && (
        <div className="absolute left-[19px] top-10 bottom-0 w-px bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)]" />
      )}

      {/* 时间轴节点 */}
      <BrTimelineNode icon={<Trash2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />} />

      {/* 笔记卡片 */}
      <div
        className={`
          flex-1 min-w-0 p-4 rounded-md border
          transition-all duration-150 ease-in-out
          bg-white dark:bg-[#141414]
          border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]
          ${isHovered
            ? 'shadow-md border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.1)]'
            : 'shadow-sm'
          }
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 笔记信息 */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 truncate">
              {note.title || '无标题'}
            </h4>
            <p className="text-[13px] text-gray-500 mt-1 line-clamp-2">
              {note.content
                ? note.content.substring(0, 100).replace(/[#*_\[\]]/g, '')
                : '空白笔记'}
            </p>
            <p className="text-[11px] text-gray-400 mt-2">
              删除于 {formatDate(note.trashedAt ?? note.updatedAt)}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={() => onRestore(note.id)}
              className="h-7 px-3 rounded-md text-[12px] font-medium bg-[var(--color-primary-subtle)] text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] transition-colors duration-150 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              恢复
            </button>
            <button
              onClick={() => onDelete(note.id)}
              className="h-7 px-3 rounded-md text-[12px] font-medium text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors duration-150 flex items-center gap-1.5"
            >
              <Trash className="w-3 h-3" />
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 分组标题组件
const BrGroupHeader: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="flex items-center gap-2">
      <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
      <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">{label}</span>
    </div>
    <span className="text-[11px] text-gray-400 dark:text-gray-500">{count} 个笔记</span>
  </div>
);

// 空状态组件
const EmptyState: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        {/* 图标背景 */}
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1A1A1A] flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-gray-300 dark:text-gray-700" />
        </div>
        {/* 文字 */}
        <p className="text-[13px] text-gray-500">回收站是空的</p>
      </div>
    </div>
  );
};

const BrTrashView: React.FC = () => {
  const notes = useNoteStore((s) => s.notes);
  const restoreNote = useNoteStore((s) => s.restoreNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const emptyTrash = useNoteStore((s) => s.emptyTrash);

  const trashedNotes = useMemo(
    () => notes.filter((n) => n.isTrashed),
    [notes],
  );

  // 按时间分组
  const groupedNotes = useMemo((): GroupedNotes[] => {
    const groups: Record<TimeGroup, typeof trashedNotes> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    trashedNotes.forEach((note) => {
      const date = note.trashedAt ?? note.updatedAt;
      const group = getTimeGroup(date);
      groups[group].push(note);
    });

    const order: TimeGroup[] = ['today', 'yesterday', 'thisWeek', 'older'];
    return order
      .map((key) => ({
        label: getGroupLabel(key),
        key,
        notes: groups[key],
      }))
      .filter((g) => g.notes.length > 0);
  }, [trashedNotes]);

  // 恢复笔记
  const handleRestore = useCallback(
    async (id: string) => {
      await restoreNote(id);
      toast.success('笔记已恢复');
    },
    [restoreNote],
  );

  // 永久删除笔记
  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = await confirm(
        '此操作不可恢复，确定要永久删除这条笔记吗？',
        { title: '确认删除', kind: 'warning' }
      );

      if (confirmed) {
        await deleteNote(id);
      }
    },
    [deleteNote],
  );

  // 清空回收站
  const handleEmptyTrash = useCallback(async () => {
    const confirmed = await confirm(
      `确定要永久删除回收站中的 ${trashedNotes.length} 条笔记吗？此操作不可恢复。`,
      { title: '确认清空', kind: 'warning' }
    );

    if (confirmed) {
      await emptyTrash();
    }
  }, [emptyTrash, trashedNotes.length]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-[16px] font-medium text-gray-900 dark:text-gray-100">回收站</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">
            {trashedNotes.length} 个笔记
          </p>
        </div>

        {trashedNotes.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="h-8 px-3 rounded-md text-[13px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-150"
          >
            清空回收站
          </button>
        )}
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {trashedNotes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="max-w-2xl mx-auto flex flex-col gap-8">
            {groupedNotes.map((group) => (
              <div key={group.key}>
                <BrGroupHeader label={group.label} count={group.notes.length} />
                <div className="flex flex-col gap-3">
                  {group.notes.map((note, index) => (
                    <BrTimelineCard
                      key={note.id}
                      note={note}
                      onRestore={handleRestore}
                      onDelete={handleDelete}
                      isLast={index === group.notes.length - 1}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrTrashView;
