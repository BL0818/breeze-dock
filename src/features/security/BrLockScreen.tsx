import React, { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingStore } from '../../stores/useSettingStore';
import { useUIStore } from '../../stores/useUIStore';
import { Lock, Fingerprint, AlertCircle, Loader2 } from 'lucide-react';

// ============================================================
// BrLockScreen - Linear 极简风格锁屏界面（增强版）
// ============================================================

const BrLockScreen: React.FC = () => {
  const settings = useSettingStore((s) => s.settings);
  const hideLockScreen = useUIStore((s) => s.hideLockScreen);
  const showToast = useUIStore((s) => s.showToast);

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isWindowsHelloAvailable, setIsWindowsHelloAvailable] = useState(false);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 检查 Windows Hello 可用性
  useEffect(() => {
    const checkWindowsHello = async () => {
      try {
        const available = await invoke<boolean>('check_windows_hello_available');
        setIsWindowsHelloAvailable(available && settings.security.windowsHelloEnabled);
      } catch {
        setIsWindowsHelloAvailable(false);
      }
    };
    checkWindowsHello();
  }, [settings.security.windowsHelloEnabled]);

  // 启动自动锁定倒计时
  useEffect(() => {
    if (settings.security.autoLockTimeout > 0 && !countdown) {
      setCountdown(settings.security.autoLockTimeout * 60);
    }
  }, [settings.security.autoLockTimeout, countdown]);

  // 倒计时逻辑
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownRef.current!);
          useUIStore.getState().lockApp();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [countdown]);

  // 重置倒计时（用户活动时）
  const resetCountdown = useCallback(() => {
    if (settings.security.autoLockTimeout > 0) {
      setCountdown(settings.security.autoLockTimeout * 60);
    }
  }, [settings.security.autoLockTimeout]);

  // 验证密码
  const verifyPassword = useCallback(async (pwd: string) => {
    if (pwd.length < 4) {
      setError('请输入至少 4 位密码');
      return false;
    }

    setIsVerifying(true);
    try {
      const isValid = await invoke<boolean>('verify_password', { password: pwd });
      if (isValid) {
        hideLockScreen();
        resetCountdown();
        return true;
      } else {
        setError('密码错误');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return false;
      }
    } catch {
      setError('验证失败');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [hideLockScreen, resetCountdown]);

  const handleUnlock = useCallback(() => {
    verifyPassword(password);
  }, [password, verifyPassword]);

  const handleEnter = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyPassword(password);
    }
  }, [password, verifyPassword]);

  // Windows Hello 解锁
  const handleWindowsHello = useCallback(async () => {
    try {
      const success = await invoke<boolean>('authenticate_windows_hello');
      if (success) {
        hideLockScreen();
        resetCountdown();
        showToast('success', '解锁成功');
      } else {
        setError('Windows Hello 认证失败');
      }
    } catch (error) {
      setError('Windows Hello 不可用');
      showToast('error', `认证失败: ${error}`);
    }
  }, [hideLockScreen, resetCountdown, showToast]);

  // 忘记密码 - 重置应用
  const handleForgotPassword = useCallback(() => {
    showToast('warning', '重置将清除所有数据');
    // 显示确认对话框逻辑可以在这里添加
  }, [showToast]);

  // 格式化倒计时显示
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-[#141414] transition-opacity duration-200"
      onClick={resetCountdown}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') resetCountdown();
      }}
    >
      {/* 倒计时指示器 */}
      {countdown !== null && (
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[#1A1A1A]">
          <Lock className="w-3 h-3 text-gray-400" />
          <span className="text-[11px] text-gray-500 font-mono">
            {formatCountdown(countdown)}
          </span>
        </div>
      )}

      {/* 应用图标 */}
      <div className="w-16 h-16 rounded-xl bg-[var(--color-primary-subtle)] flex items-center justify-center mb-6 animate-fade-in">
        <Lock className="w-8 h-8 text-[var(--color-primary)]" />
      </div>

      {/* 应用名 */}
      <h1 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100 mb-1 animate-fade-in">
        BreezeDock
      </h1>
      <p className="text-[13px] text-gray-500 mb-8 animate-fade-in">请输入密码以解锁</p>

      {/* 密码输入 */}
      <div
        className={`w-72 transition-all duration-150 ${shake ? 'animate-shake' : ''} ${error ? 'animate-shake' : ''}`}
        style={shake ? { animation: 'shake 0.5s ease-out' } : undefined}
      >
        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyDown={handleEnter}
            placeholder="输入密码"
            className="w-full h-11 px-4 rounded-md bg-white dark:bg-[#1A1A1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] text-[14px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:border-[var(--color-primary)] transition-colors"
            disabled={isVerifying}
          />
          {isVerifying && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-[var(--color-primary)] animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-1.5 mt-3 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          <p className="text-[13px] text-red-500">{error}</p>
        </div>
      )}

      {/* 解锁按钮 */}
      <button
        onClick={handleUnlock}
        disabled={isVerifying}
        className="w-72 h-10 mt-4 rounded-md bg-[var(--color-primary)] text-white text-[14px] font-medium hover:bg-[#306AFF] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 animate-fade-in"
      >
        {isVerifying ? '验证中...' : '解锁'}
      </button>

      {/* 忘记密码 */}
      <button
        onClick={handleForgotPassword}
        className="mt-4 text-[12px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors animate-fade-in"
      >
        忘记密码？<span className="text-[var(--color-primary)]">重置应用将清除所有数据</span>
      </button>

      {/* 分隔线 */}
      {isWindowsHelloAvailable && (
        <>
          <div className="flex items-center gap-3 mt-6 w-72 animate-fade-in">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-[11px] text-gray-400">或</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Windows Hello 快捷解锁 */}
          <button
            onClick={handleWindowsHello}
            className="mt-4 w-72 h-10 rounded-md bg-gray-100 dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-300 text-[14px] font-medium hover:bg-gray-200 dark:hover:bg-[#242424] flex items-center justify-center gap-2 transition-all duration-150 animate-fade-in"
          >
            <Fingerprint className="w-4 h-4" />
            Windows Hello
          </button>
        </>
      )}
    </div>
  );
};

export default BrLockScreen;
