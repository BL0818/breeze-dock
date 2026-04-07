import React, { useState, useCallback } from 'react';
import { useSettingStore } from '../../stores/useSettingStore';
import { useUIStore } from '../../stores/useUIStore';
import { invoke } from '@tauri-apps/api/core';
import { Lock, Fingerprint, Eye, EyeOff, Shield, Timer } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// ============================================================
// BrSecuritySettings - 安全与隐私设置
// ============================================================

const AUTO_LOCK_OPTIONS = [
  { value: 1, label: '1分钟' },
  { value: 5, label: '5分钟' },
  { value: 15, label: '15分钟' },
  { value: 0, label: '永不' },
];

// 密码强度计算
function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: '弱', color: 'text-red-500' };
  if (score <= 4) return { score, label: '中等', color: 'text-yellow-500' };
  return { score, label: '强', color: 'text-green-500' };
}

const BrSecuritySettings: React.FC = () => {
  const settings = useSettingStore((s) => s.settings);
  const showToast = useUIStore((s) => s.showToast);

  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  // Handle set password
  const handleSetPassword = useCallback(async () => {
    if (password.length < 4) {
      showToast('error', '密码至少需要 4 位');
      return;
    }
    if (password !== confirmPassword) {
      showToast('error', '两次输入的密码不一致');
      return;
    }

    setIsSettingPassword(true);
    try {
      const hash = await invoke<string>('hash_password', { password });
      useSettingStore.getState().setPasswordHash(hash);
      useSettingStore.getState().updateSettings({ enablePassword: true });
      showToast('success', '密码设置成功');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      showToast('error', `设置密码失败: ${error}`);
    } finally {
      setIsSettingPassword(false);
    }
  }, [password, confirmPassword, showToast]);

  // Handle remove password
  const handleRemovePassword = useCallback(async () => {
    try {
      await invoke('remove_password');
      useSettingStore.getState().setPasswordHash(null);
      useSettingStore.getState().updateSettings({ enablePassword: false });
      showToast('success', '密码已移除');
    } catch (error) {
      showToast('error', `移除密码失败: ${error}`);
    }
  }, [showToast]);

  // Handle Windows Hello toggle
  const handleWindowsHelloToggle = useCallback(async () => {
    try {
      await useSettingStore.getState().toggleWindowsHello();
      showToast('success', settings.security.windowsHelloEnabled ? 'Windows Hello 已禁用' : 'Windows Hello 已启用');
    } catch (error) {
      showToast('error', `切换失败: ${error}`);
    }
  }, [settings.security.windowsHelloEnabled, showToast]);

  // Handle incognito mode toggle
  const handleIncognitoToggle = useCallback(() => {
    useSettingStore.getState().toggleIncognitoMode();
    const newState = !settings.security.incognitoMode;
    useUIStore.getState().setIncognito(newState);
    showToast('info', newState ? '无痕模式已启用' : '无痕模式已禁用');
  }, [settings.security.incognitoMode, showToast]);

  // Handle encryption toggle
  const handleEncryptionToggle = useCallback(() => {
    useSettingStore.getState().toggleEncryption();
    showToast('success', settings.security.encryptionEnabled ? '加密已禁用' : '加密已启用');
  }, [settings.security.encryptionEnabled, showToast]);

  // Handle auto lock timeout change
  const handleAutoLockChange = useCallback((minutes: number) => {
    useSettingStore.getState().setAutoLockTimeout(minutes);
    showToast('success', minutes === 0 ? '自动锁定已禁用' : `自动锁定时间已设置为 ${minutes} 分钟`);
  }, [showToast]);

  const passwordStrength = password ? calculatePasswordStrength(password) : null;

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-subtle)] flex items-center justify-center">
          <Shield className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div>
          <h2 className="text-[15px] font-medium text-gray-900 dark:text-gray-100">安全与隐私</h2>
          <p className="text-[12px] text-gray-500">管理密码、生物识别和数据保护</p>
        </div>
      </div>

      {/* 应用密码 */}
      <section className="bg-white dark:bg-[#1A1A1A] rounded-lg border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">应用密码</h3>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {settings.enablePassword ? (
            <>
              <p className="text-[13px] text-gray-600 dark:text-gray-400">
                密码保护已启用
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemovePassword}
              >
                移除密码
              </Button>
            </>
          ) : (
            <>
              {/* 密码输入 */}
              <div className="space-y-1">
                <label className="text-[12px] text-gray-500">设置密码</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入密码"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordStrength && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${passwordStrength.color.replace('text-', 'bg-')}`}
                        style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                      />
                    </div>
                    <span className={`text-[11px] ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* 确认密码 */}
              <div className="space-y-1">
                <label className="text-[12px] text-gray-500">确认密码</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                />
              </div>

              <Button
                onClick={handleSetPassword}
                disabled={isSettingPassword || !password || !confirmPassword}
                size="sm"
              >
                {isSettingPassword ? '设置中...' : '启用密码保护'}
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Windows Hello */}
      <section className="bg-white dark:bg-[#1A1A1A] rounded-lg border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-gray-500" />
              <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">Windows Hello</h3>
            </div>
            <Switch
              checked={settings.security.windowsHelloEnabled}
              onCheckedChange={handleWindowsHelloToggle}
            />
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-[12px] text-gray-500">
            使用 Windows Hello 解锁应用（指纹、面部识别或 PIN）
          </p>
        </div>
      </section>

      {/* 无痕模式 */}
      <section className="bg-white dark:bg-[#1A1A1A] rounded-lg border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-500" />
              <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">无痕模式</h3>
            </div>
            <Switch
              checked={settings.security.incognitoMode}
              onCheckedChange={handleIncognitoToggle}
            />
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-[12px] text-gray-500">
            启用后，关闭应用将自动销毁所有未备份的数据
          </p>
        </div>
      </section>

      {/* 加密 */}
      <section className="bg-white dark:bg-[#1A1A1A] rounded-lg border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-500" />
              <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">数据加密</h3>
            </div>
            <Switch
              checked={settings.security.encryptionEnabled}
              onCheckedChange={handleEncryptionToggle}
            />
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-[12px] text-gray-500">
            启用后，所有笔记将以加密格式存储
          </p>
        </div>
      </section>

      {/* 自动锁定 */}
      <section className="bg-white dark:bg-[#1A1A1A] rounded-lg border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-gray-500" />
            <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">自动锁定</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {AUTO_LOCK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleAutoLockChange(opt.value)}
                className={`
                  px-3 py-1.5 rounded-md text-[12px] transition-colors duration-150
                  ${settings.security.autoLockTimeout === opt.value
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-gray-100 dark:bg-[#242424] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2A2A2A]'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BrSecuritySettings;
