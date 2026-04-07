import { useEffect, useRef } from 'react';
import { useNoteStore } from '../stores/useNoteStore';

/**
 * 自动保存 Hook
 *
 * 注意：当前自动保存逻辑已合并到 useNoteStore.updateNote 中。
 * 每次编辑器 onChange 会立即乐观更新本地状态并异步持久化到后端。
 * 此 Hook 保留用于未来可能的扩展（如后台定期同步、脏状态提示等）。
 */
export function useAutoSave() {
  const currentNoteId = useNoteStore((s) => s.currentNoteId);
  const lastNoteIdRef = useRef<string | null>(null);

  // 切换笔记时记录日志（调试用）
  useEffect(() => {
    if (currentNoteId !== lastNoteIdRef.current) {
      lastNoteIdRef.current = currentNoteId;
    }
  }, [currentNoteId]);
}
