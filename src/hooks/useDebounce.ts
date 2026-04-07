import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// useDebounce - 通用防抖 Hook
// ============================================================

/**
 * 通用防抖 Hook
 *
 * - 延迟更新值，直到停止触发后经过指定时间
 * - 适用于搜索输入、窗口大小监听等高频场景
 *
 * @param value 需要防抖的值
 * @param delay 延迟时间（ms），默认 300ms
 * @returns 防抖后的值
 *
 * @example
 * ```tsx
 * const [input, setInput] = useState('');
 * const debouncedInput = useDebounce(input, 500);
 *
 * useEffect(() => {
 *   // 使用 debouncedInput 进行搜索
 * }, [debouncedInput]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 清除上一次定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 设置新的定时器
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 防抖函数 Hook
 *
 * - 返回一个防抖版本的回调函数
 * - 适用于事件处理函数
 *
 * @param callback 需要防抖的回调函数
 * @param delay 延迟时间（ms），默认 300ms
 * @returns 防抖后的回调函数
 */
export function useDebounceFn<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300,
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // 始终使用最新的回调
  callbackRef.current = callback;

  const debouncedFn = useCallback(
    (...args: unknown[]) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timerRef.current = null;
      }, delay);
    },
    [delay],
  ) as T;

  // 卸载清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return debouncedFn;
}
