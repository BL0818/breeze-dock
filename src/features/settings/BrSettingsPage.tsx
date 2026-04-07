import React, { useRef, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingStore } from '../../stores/useSettingStore';
import { useUIStore } from '../../stores/useUIStore';
import { Sun, Moon, Laptop, RefreshCcw, Palette, X, Keyboard } from 'lucide-react';
import type { ThemeMode, Language, ThemeColors } from '../../types';
import { THEME_PRESETS } from '../../types';
import { PRESET_COLORS } from '@/components/ui/color-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ColorPicker } from '@/components/ui/color-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { SHORTCUT_DEFINITIONS } from '@/hooks/useGlobalShortcuts';
import BrSecuritySettings from '../security/BrSecuritySettings';
import BrBackupPage from '../backup/BrBackupPage';

// ============================================================
// BrSettingsPage - Linear 极简风格设置页面（左右两栏布局）
// ============================================================

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Laptop },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
];

const SETTINGS_GROUPS = [
  { id: 'appearance', label: '外观' },
  { id: 'editor', label: '编辑器' },
  { id: 'shortcuts', label: '快捷键' },
  { id: 'general', label: '通用' },
  { id: 'system', label: '系统' },
  { id: 'security', label: '安全' },
  { id: 'backup', label: '备份' },
  { id: 'about', label: '关于' },
] as const;

type GroupId = typeof SETTINGS_GROUPS[number]['id'];

const BrSettingsPage: React.FC = () => {
  const settings = useSettingStore((s) => s.settings);
  const setTheme = useSettingStore((s) => s.setTheme);
  const setFontSize = useSettingStore((s) => s.setFontSize);
  const setAutoSaveDelay = useSettingStore((s) => s.setAutoSaveDelay);
  const setLanguage = useSettingStore((s) => s.setLanguage);
  const toggleStartupOnBoot = useSettingStore((s) => s.toggleStartupOnBoot);
  const toggleTrayIcon = useSettingStore((s) => s.toggleTrayIcon);
  const toggleNotifications = useSettingStore((s) => s.toggleNotifications);
  const updateEditorSettings = useSettingStore((s) => s.updateEditorSettings);
  const updateColors = useSettingStore((s) => s.updateColors);
  const setColors = useSettingStore((s) => s.setColors);
  const resetColors = useSettingStore((s) => s.resetColors);
  const toggleShortcut = useSettingStore((s) => s.toggleShortcut);
  const showToast = useUIStore((s) => s.showToast);

  // 处理主色变化：成功跟随主色，如果警告/错误冲突则自动调整
  const handlePrimaryChange = (primary: string) => {
    const updates: Partial<ThemeColors> = { primary };

    // 成功默认跟随主色
    updates.success = primary;

    // 如果警告与主色相同，自动调整为其他颜色
    if (settings.colors.warning === primary) {
      const otherColors = PRESET_COLORS.filter(c => c !== primary && c !== settings.colors.error);
      updates.warning = otherColors[0] || '#F59E0B';
    }

    // 如果错误与主色相同，自动调整为其他颜色
    if (settings.colors.error === primary) {
      const otherColors = PRESET_COLORS.filter(c => c !== primary && c !== updates.warning);
      updates.error = otherColors[0] || '#EF4444';
    }

    updateColors(updates);
  };

  // 处理警告颜色变化：不能与错误相同，不能与主色相同
  const handleWarningChange = (warning: string) => {
    if (warning === settings.colors.error) {
      showToast('error', '警告颜色不能与错误颜色相同');
      return;
    }
    if (warning === settings.colors.primary) {
      showToast('error', '警告颜色不能与主色相同');
      return;
    }
    updateColors({ warning });
  };

  // 处理错误颜色变化：不能与警告相同，不能与主色相同
  const handleErrorChange = (error: string) => {
    if (error === settings.colors.warning) {
      showToast('error', '错误颜色不能与警告颜色相同');
      return;
    }
    if (error === settings.colors.primary) {
      showToast('error', '错误颜色不能与主色相同');
      return;
    }
    updateColors({ error });
  };

  // 处理预设方案选择
  const handlePresetSelect = (preset: typeof THEME_PRESETS[0]) => {
    const primary = preset.colors.primary;

    // 找到与主色不同的警告和错误颜色
    const otherColors = PRESET_COLORS.filter(c => c !== primary);

    setColors({
      primary,
      success: primary, // 成功跟随主色
      info: preset.colors.info || primary,
      // 警告和错误必须与主色不同且互不相同
      warning: otherColors[1] || '#F59E0B',
      error: otherColors[2] || '#EF4444',
    });
  };

  const [activeGroup, setActiveGroup] = useState<GroupId>('appearance');
  const contentRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<GroupId, HTMLDivElement | null>>({
    appearance: null,
    editor: null,
    shortcuts: null,
    general: null,
    system: null,
    security: null,
    backup: null,
    about: null,
  });

  // 点击左侧导航滚动到对应分组
  const scrollToGroup = (groupId: GroupId) => {
    const element = groupRefs.current[groupId];
    if (element && contentRef.current) {
      const container = contentRef.current;
      const offsetTop = element.offsetTop - 24; // 留出顶部间距
      container.scrollTo({ top: offsetTop, behavior: 'smooth' });
      setActiveGroup(groupId);
    }
  };

  // 监听滚动更新当前激活分组
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      let currentGroup: GroupId = 'appearance';

      for (const group of SETTINGS_GROUPS) {
        const element = groupRefs.current[group.id];
        if (element && element.offsetTop - 100 <= scrollTop) {
          currentGroup = group.id;
        }
      }
      setActiveGroup(currentGroup);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden bg-white dark:bg-[#141414]">
      {/* 左侧导航栏 */}
      <div className="w-[140px] min-w-[120px] flex-shrink-0 border-r border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] bg-[#FAFAFA] dark:bg-[#141414]">
        {/* 头部 */}
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <h2 className="text-[15px] font-medium text-gray-900 dark:text-gray-100">设置</h2>
        </div>

        {/* 分组导航 */}
        <nav className="p-2">
          {SETTINGS_GROUPS.map((group) => (
            <button
              key={group.id}
              onClick={() => scrollToGroup(group.id)}
              className={`
                w-full flex items-center px-3 py-2 rounded-md text-[13px] whitespace-nowrap transition-colors duration-150
                ${activeGroup === group.id
                  ? 'bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 font-medium shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-[#1A1A1A]/50'
                }
              `}
            >
              {group.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 右侧内容区 */}
      <div ref={contentRef} className="flex-1 overflow-y-auto bg-white dark:bg-[#141414]">
        <div className="p-6" style={{ minWidth: '500px' }}>
          {/* ===== 外观 ===== */}
          <div ref={(el) => { groupRefs.current.appearance = el; }}>
            <SettingsSection title="外观">
              {/* 主题模式 */}
              <SettingsRow label="主题模式">
                <div className="flex gap-2">
                  {THEME_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = settings.theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] transition-colors duration-150
                          ${isSelected
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-gray-100 dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#242424]'
                          }
                        `}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </SettingsRow>

              {/* 字体大小 */}
              <SettingsRow label={`字体大小 (${settings.fontSize}px)`}>
                <input
                  type="range"
                  min={12}
                  max={24}
                  step={1}
                  value={settings.fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-40"
                />
              </SettingsRow>

              {/* 主题颜色 */}
              <SettingsRow label="主题颜色" description="自定义应用主题色">
                <div className="flex items-center gap-2">
                  {/* 预设方案 */}
                  <div className="flex gap-1.5">
                    {THEME_PRESETS.map((preset) => (
                      <Tooltip key={preset.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handlePresetSelect(preset)}
                            className={`
                              w-6 h-6 rounded-full border-2 transition-all duration-150
                              ${settings.colors.primary === preset.colors.primary
                                ? 'border-gray-900 dark:border-white scale-110'
                                : 'border-transparent hover:scale-105'
                              }
                            `}
                            style={{ backgroundColor: preset.colors.primary }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>{preset.name}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
                  {/* 自定义颜色选择器 */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                            >
                              <Palette className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3" align="end">
                            <div className="space-y-2">
                              <p className="text-[12px] text-gray-500">选择主色</p>
                              <ColorPicker
                                colors={PRESET_COLORS}
                                selected={settings.colors.primary}
                                onSelect={handlePrimaryChange}
                                size="md"
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>自定义颜色</TooltipContent>
                  </Tooltip>
                  {/* 重置按钮 */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={resetColors}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] transition-colors"
                      >
                        <RefreshCcw className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>重置默认颜色</TooltipContent>
                  </Tooltip>
                </div>
              </SettingsRow>

              {/* 颜色详细设置 */}
              <SettingsRow label="详细颜色">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[12px] text-gray-500 w-12 cursor-default">主色</span>
                      </TooltipTrigger>
                      <TooltipContent side="right">应用主色调，影响按钮、链接等核心交互元素</TooltipContent>
                    </Tooltip>
                    <ColorPicker
                      colors={PRESET_COLORS}
                      selected={settings.colors.primary}
                      onSelect={handlePrimaryChange}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[12px] text-gray-500 w-12 cursor-default">成功</span>
                      </TooltipTrigger>
                      <TooltipContent side="right">成功操作提示色</TooltipContent>
                    </Tooltip>
                    <ColorPicker
                      colors={PRESET_COLORS}
                      selected={settings.colors.success}
                      onSelect={(color) => updateColors({ success: color })}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[12px] text-gray-500 w-12 cursor-default">警告</span>
                      </TooltipTrigger>
                      <TooltipContent side="right">警告提示色，不能与主色或错误色相同</TooltipContent>
                    </Tooltip>
                    <ColorPicker
                      colors={PRESET_COLORS}
                      selected={settings.colors.warning}
                      onSelect={handleWarningChange}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[12px] text-gray-500 w-12 cursor-default">错误</span>
                      </TooltipTrigger>
                      <TooltipContent side="right">错误提示色，不能与主色或警告色相同</TooltipContent>
                    </Tooltip>
                    <ColorPicker
                      colors={PRESET_COLORS}
                      selected={settings.colors.error}
                      onSelect={handleErrorChange}
                      size="sm"
                    />
                  </div>
                </div>
              </SettingsRow>
            </SettingsSection>
          </div>

          {/* ===== 编辑器 ===== */}
          <div ref={(el) => { groupRefs.current.editor = el; }}>
            <SettingsSection title="编辑器">
              {/* 自动保存延迟 */}
              <SettingsRow label={`自动保存延迟 (${settings.autoSaveDelay}ms)`}>
                <input
                  type="range"
                  min={200}
                  max={3000}
                  step={100}
                  value={settings.autoSaveDelay}
                  onChange={(e) => setAutoSaveDelay(Number(e.target.value))}
                  className="w-40 accent-[var(--color-primary)]"
                />
              </SettingsRow>

              {/* 拼写检查 */}
              <SettingsRow label="拼写检查">
                <Switch
                  checked={settings.editor.spellCheck}
                  onChange={() => updateEditorSettings({ spellCheck: !settings.editor.spellCheck })}
                />
              </SettingsRow>

              {/* 自动换行 */}
              <SettingsRow label="自动换行">
                <Switch
                  checked={settings.editor.wordWrap}
                  onChange={() => updateEditorSettings({ wordWrap: !settings.editor.wordWrap })}
                />
              </SettingsRow>

              {/* 自动闭合括号 */}
              <SettingsRow label="自动闭合括号">
                <Switch
                  checked={settings.editor.autoClosingBrackets}
                  onChange={() => updateEditorSettings({
                    autoClosingBrackets: !settings.editor.autoClosingBrackets,
                  })}
                />
              </SettingsRow>

              {/* 显示行号 */}
              <SettingsRow label="显示行号">
                <Switch
                  checked={settings.editor.showLineNumbers}
                  onChange={() => updateEditorSettings({
                    showLineNumbers: !settings.editor.showLineNumbers,
                  })}
                />
              </SettingsRow>
            </SettingsSection>
          </div>

          {/* ===== 快捷键 ===== */}
          <div ref={(el) => { groupRefs.current.shortcuts = el; }}>
            <SettingsSection title="快捷键">
              <SettingsRow label="全局快捷键" description="使用系统级快捷键，无需聚焦窗口即可触发">
                <div className="flex items-center gap-2 text-[12px] text-gray-500">
                  <Keyboard className="w-4 h-4" />
                  <span>Ctrl+Shift+?</span>
                </div>
              </SettingsRow>
              {SHORTCUT_DEFINITIONS.map((def) => (
                <SettingsRow
                  key={def.key}
                  label={def.description}
                  description={formatShortcutDisplay(def.shortcut)}
                >
                  <Switch
                    checked={settings.shortcuts[def.key]}
                    onChange={() => toggleShortcut(def.key)}
                  />
                </SettingsRow>
              ))}
            </SettingsSection>
          </div>

          {/* ===== 通用 ===== */}
          <div ref={(el) => { groupRefs.current.general = el; }}>
            <SettingsSection title="通用">
              {/* 语言 */}
              <SettingsRow label="语言">
                <Select
                  value={settings.language}
                  onValueChange={(value) => {
                    setLanguage(value as Language);
                    showToast('success', '语言设置已更新');
                  }}
                >
                  <SelectTrigger className="w-[140px] bg-gray-100 dark:bg-[#1A1A1A] border-none text-[13px] h-8">
                    <SelectValue placeholder="选择语言" />
                  </SelectTrigger>
                  <SelectContent className="border-0 shadow-lg">
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsRow>

              {/* 开机自启 */}
              <SettingsRow label="开机自启动">
                <Switch
                  checked={settings.startupOnBoot}
                  onChange={() => toggleStartupOnBoot()}
                />
              </SettingsRow>

              {/* 关闭所有悬浮窗 */}
              <SettingsRow label="关闭所有悬浮窗" description="强制关闭所有打开的悬浮笔记窗口">
                <button
                  onClick={async () => {
                    try {
                      const closedNoteIds = await invoke<string[]>('close_all_floating_windows');
                      useUIStore.getState().clearAllFloating();
                      showToast('success', `已关闭 ${closedNoteIds.length} 个悬浮窗`);
                    } catch (error) {
                      useUIStore.getState().clearAllFloating();
                      showToast('error', `操作失败: ${error}`);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  关闭全部
                </button>
              </SettingsRow>
            </SettingsSection>
          </div>

          {/* ===== 系统 ===== */}
          <div ref={(el) => { groupRefs.current.system = el; }}>
            <SettingsSection title="系统">
              {/* 托盘图标 */}
              <SettingsRow label="显示托盘图标" description="在系统托盘区域显示应用图标">
                <Switch
                  checked={settings.showTrayIcon}
                  onChange={() => toggleTrayIcon()}
                />
              </SettingsRow>

              {/* 通知 */}
              <SettingsRow label="启用通知" description="显示笔记提醒和操作反馈通知">
                <Switch
                  checked={settings.enableNotifications}
                  onChange={() => toggleNotifications()}
                />
              </SettingsRow>
            </SettingsSection>
          </div>

          {/* ===== 安全 ===== */}
          <div ref={(el) => { groupRefs.current.security = el; }}>
            <BrSecuritySettings />
          </div>

          {/* ===== 备份 ===== */}
          <div ref={(el) => { groupRefs.current.backup = el; }}>
            <BrBackupPage />
          </div>

          {/* ===== 关于 ===== */}
          <div ref={(el) => { groupRefs.current.about = el; }}>
            <SettingsSection title="关于">
              <SettingsRow label="版本">
                <span className="text-[13px] text-gray-500">0.1.0</span>
              </SettingsRow>
              <SettingsRow label="构建">
                <span className="text-[13px] text-gray-500">Tauri v2 + React 18</span>
              </SettingsRow>
            </SettingsSection>
          </div>
        </div>
      </div>
    </div>
  );
};

// 设置分组
const SettingsSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3 px-4" style={{ whiteSpace: 'nowrap' }}>
      {title}
    </h2>
    <div className="bg-white dark:bg-[#141414] rounded-lg border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] divide-y divide-[rgba(0,0,0,0.06)] dark:divide-[rgba(255,255,255,0.06)]">
      {children}
    </div>
  </section>
);

// 设置行
const SettingsRow: React.FC<{
  label: string;
  description?: string;
  children: React.ReactNode;
}> = ({ label, description, children }) => (
  <div className="flex flex-row items-center justify-between px-4 py-3 gap-8">
    <div className="flex-1 min-w-0">
      <p className="text-[13px] text-gray-900 dark:text-gray-100" style={{ whiteSpace: 'nowrap' }}>{label}</p>
      {description && (
        <p className="text-[12px] text-gray-500 mt-0.5" style={{ whiteSpace: 'nowrap' }}>{description}</p>
      )}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

// Switch 组件 - Linear 风格
interface SwitchProps {
  checked: boolean;
  onChange: () => void;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`
      relative w-9 h-5 rounded-full transition-colors duration-150
      ${checked ? 'bg-[var(--color-primary)]' : 'bg-gray-300 dark:bg-gray-700'}
    `}
  >
    <span
      className={`
        absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150
        ${checked ? 'translate-x-4' : 'translate-x-0'}
      `}
    />
  </button>
);

/** 格式化快捷键显示文本 */
function formatShortcutDisplay(shortcut: string): string {
  return shortcut
    .replace('CommandOrControl', 'Ctrl')
    .replace('+', ' + ');
}

export default BrSettingsPage;
