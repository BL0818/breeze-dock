import React, { useState, useCallback, useRef } from 'react';
import { useSettingStore } from '../../stores/useSettingStore';
import { useUIStore } from '../../stores/useUIStore';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { Upload, Download, AlertTriangle, FileText, Lock, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================================
// BrBackupPage - 备份与迁移页面
// ============================================================

const BrBackupPage: React.FC = () => {
  const settings = useSettingStore((s) => s.settings);
  const showToast = useUIStore((s) => s.showToast);

  // Export password state
  const [exportPassword, setExportPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('merge');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle export as plain JSON
  const handleExportPlain = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = await invoke<string>('export_data_plain');
      const filePath = await save({
        defaultPath: `breezedock-backup-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (filePath) {
        await invoke('write_file', { path: filePath, content: data });
        showToast('success', '数据导出成功');
      }
    } catch (error) {
      showToast('error', `导出失败: ${error}`);
    } finally {
      setIsExporting(false);
    }
  }, [showToast]);

  // Handle export as encrypted JSON
  const handleExportEncrypted = useCallback(async () => {
    if (!exportPassword) {
      showToast('error', '请输入导出密码');
      return;
    }
    setIsExporting(true);
    try {
      const data = await invoke<string>('export_data_encrypted', { password: exportPassword });
      const filePath = await save({
        defaultPath: `breezedock-backup-encrypted-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (filePath) {
        await invoke('write_file', { path: filePath, content: data });
        showToast('success', '加密数据导出成功');
        setExportPassword('');
      }
    } catch (error) {
      showToast('error', `导出失败: ${error}`);
    } finally {
      setIsExporting(false);
    }
  }, [exportPassword, showToast]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      showToast('error', '请选择要导入的文件');
      return;
    }
    setIsImporting(true);
    try {
      const content = await selectedFile.text();
      await invoke('import_data', {
        data: content,
        mode: importMode,
        password: settings.security.encryptionEnabled ? exportPassword : undefined,
      });
      showToast('success', '数据导入成功');
      setSelectedFile(null);
    } catch (error) {
      showToast('error', `导入失败: ${error}`);
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, importMode, exportPassword, settings.security.encryptionEnabled, showToast]);

  // Handle delete all data
  const handleDeleteAll = useCallback(async () => {
    if (deleteConfirmText !== '确认删除') {
      showToast('error', '请输入"确认删除"以确认操作');
      return;
    }
    setIsDeleting(true);
    try {
      await invoke('clear_all_data');
      showToast('success', '所有数据已清空');
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    } catch (error) {
      showToast('error', `清空失败: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirmText, showToast]);

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-subtle)] flex items-center justify-center">
          <Download className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div>
          <h2 className="text-[15px] font-medium text-gray-900 dark:text-gray-100">备份与迁移</h2>
          <p className="text-[12px] text-gray-500">导出、导入和管理应用数据</p>
        </div>
      </div>

      {/* 导出数据 */}
      <section className="bg-white dark:bg-[#1A1A1A] rounded-lg border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-gray-500" />
            <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">导出数据</h3>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {/* 导出明文 */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#242424]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">导出为明文 JSON</span>
                </div>
                <p className="text-[12px] text-gray-500">所有笔记以可读格式导出，方便在其他应用中使用</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPlain}
                disabled={isExporting}
              >
                导出明文
              </Button>
            </div>
          </div>

          {/* 导出加密 */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#242424]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-gray-500" />
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">导出为加密 JSON</span>
                </div>
                <p className="text-[12px] text-gray-500">使用密码加密，需要密码才能导入</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Input
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="输入导出密码"
                className="w-48"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportEncrypted}
                disabled={isExporting || !exportPassword}
              >
                导出加密
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 导入数据 */}
      <section className="bg-white dark:bg-[#1A1A1A] rounded-lg border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-gray-500" />
            <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">导入数据</h3>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {/* 文件拖拽区 */}
          <div
            className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center hover:border-[var(--color-primary)] transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            {selectedFile ? (
              <p className="text-[13px] text-gray-900 dark:text-gray-100">{selectedFile.name}</p>
            ) : (
              <>
                <p className="text-[13px] text-gray-600 dark:text-gray-400">将文件拖拽到此处或点击选择</p>
                <p className="text-[12px] text-gray-400 mt-1">支持 .json 格式</p>
              </>
            )}
          </div>

          {/* 导入选项 */}
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-gray-500">导入模式：</span>
            <div className="flex gap-2">
              <button
                onClick={() => setImportMode('overwrite')}
                className={`
                  px-3 py-1.5 rounded-md text-[12px] transition-colors duration-150
                  ${importMode === 'overwrite'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-gray-100 dark:bg-[#242424] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2A2A2A]'
                  }
                `}
              >
                覆盖现有数据
              </button>
              <button
                onClick={() => setImportMode('merge')}
                className={`
                  px-3 py-1.5 rounded-md text-[12px] transition-colors duration-150
                  ${importMode === 'merge'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-gray-100 dark:bg-[#242424] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2A2A2A]'
                  }
                `}
              >
                合并数据
              </button>
            </div>
          </div>

          <Button
            onClick={handleImport}
            disabled={isImporting || !selectedFile}
          >
            {isImporting ? '导入中...' : '开始导入'}
          </Button>
        </div>
      </section>

      {/* 危险操作 */}
      <section className="bg-white dark:bg-[#1A1A1A] rounded-lg border border-red-200 dark:border-red-900">
        <div className="px-4 py-3 border-b border-red-200 dark:border-red-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-[13px] font-medium text-red-600 dark:text-red-400">危险操作</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">清空所有数据</p>
              <p className="text-[12px] text-gray-500 mt-0.5">此操作不可恢复，将删除所有笔记和设置</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              清空所有数据
            </Button>
          </div>
        </div>
      </section>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              确认清空所有数据
            </DialogTitle>
            <DialogDescription>
              此操作不可恢复。所有笔记、标签和设置都将被永久删除。
              请在下方输入"确认删除"以继续。
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder='请输入"确认删除"'
              className="border-red-300 dark:border-red-700"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText('');
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={deleteConfirmText !== '确认删除' || isDeleting}
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrBackupPage;
