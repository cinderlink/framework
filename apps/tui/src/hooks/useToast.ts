/**
 * Toast Notification System Hook
 *
 * Provides a simple toast notification system for user feedback.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  createdAt: number;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

export interface UseToastReturn {
  toasts: Toast[];
  addToast: (message: string, options?: ToastOptions) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const DEFAULT_DURATION = 3000; // 3 seconds

/**
 * Hook for managing toast notifications
 */
export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));

    // Clear the timeout if it exists
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback((message: string, options: ToastOptions = {}): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = options.duration ?? DEFAULT_DURATION;
    const type = options.type ?? 'info';

    const toast: Toast = {
      id,
      type,
      message,
      duration,
      createdAt: Date.now(),
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove after duration
    if (duration > 0) {
      const timeout = setTimeout(() => {
        removeToast(id);
      }, duration);
      timeoutsRef.current.set(id, timeout);
    }

    return id;
  }, [removeToast]);

  const clearToasts = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();

    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
  };
}

/**
 * Convenience functions for different toast types
 */
export function createToastHelpers(addToast: UseToastReturn['addToast']) {
  return {
    info: (message: string, duration?: number) =>
      addToast(message, { type: 'info', duration }),
    success: (message: string, duration?: number) =>
      addToast(message, { type: 'success', duration }),
    warning: (message: string, duration?: number) =>
      addToast(message, { type: 'warning', duration }),
    error: (message: string, duration?: number) =>
      addToast(message, { type: 'error', duration }),
  };
}
