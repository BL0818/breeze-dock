import React, { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSettingStore } from '@/stores/useSettingStore';
import { invoke } from '@tauri-apps/api/core';

interface BrCloseConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 关闭确认弹窗
 * Linear 极简风格，询问用户是直接退出还是最小化到托盘
 */
export const BrCloseConfirmModal: React.FC<BrCloseConfirmModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { settings, setCloseToTray, setConfirmBeforeClose } = useSettingStore();
  const [closeAction, setCloseAction] = useState<'minimize' | 'quit'>(
    settings.closeToTray ? 'minimize' : 'quit'
  );
  const [rememberChoice, setRememberChoice] = useState(false);

  const handleConfirm = async () => {
    // 如果勾选"不再询问"，保存用户偏好
    if (rememberChoice) {
      setConfirmBeforeClose(false);
      setCloseToTray(closeAction === 'minimize');
    }

    if (closeAction === 'minimize') {
      // 最小化到托盘
      await getCurrentWindow().hide();
    } else {
      // 直接退出 - 关闭所有悬浮窗然后退出
      try {
        await invoke('close_all_floating_windows');
      } catch {
        // 忽略错误
      }
      await getCurrentWindow().close();
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[320px] p-5">
        <div className="space-y-4">
          {/* 标题 */}
          <DialogTitle className="text-base font-semibold text-foreground">
            关闭 BreezeDock
          </DialogTitle>

          {/* 单选：最小化到托盘 / 直接退出 */}
          <div className="space-y-3">
            <span className="text-sm text-muted-foreground">选择关闭行为：</span>
            <div className="space-y-2.5 pl-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                  closeAction === 'minimize'
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30'
                }`}>
                  {closeAction === 'minimize' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <input
                  type="radio"
                  name="closeAction"
                  value="minimize"
                  checked={closeAction === 'minimize'}
                  onChange={() => setCloseAction('minimize')}
                  className="sr-only"
                />
                <span className="text-sm group-hover:text-foreground transition-colors">
                  最小化到托盘
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                  closeAction === 'quit'
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30'
                }`}>
                  {closeAction === 'quit' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <input
                  type="radio"
                  name="closeAction"
                  value="quit"
                  checked={closeAction === 'quit'}
                  onChange={() => setCloseAction('quit')}
                  className="sr-only"
                />
                <span className="text-sm group-hover:text-foreground transition-colors">
                  直接退出
                </span>
              </label>
            </div>
          </div>

          {/* 复选框：下次不再询问 */}
          <label className="flex items-center gap-3 cursor-pointer group pt-1">
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              rememberChoice
                ? 'bg-primary border-primary'
                : 'border-muted-foreground/30'
            }`}>
              {rememberChoice && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="sr-only"
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              下次不再询问
            </span>
          </label>
        </div>

        {/* 按钮 - Linear 风格右对齐 */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            取消
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            确认
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrCloseConfirmModal;
