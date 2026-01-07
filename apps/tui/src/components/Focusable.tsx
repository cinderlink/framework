/**
 * Focusable Component
 *
 * A wrapper component that makes its children focusable via keyboard navigation.
 * Integrates with the KeyboardContext for handling focus-specific keyboard events.
 */

import { createContext, useContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { useKeyboardHandler, type KeyEvent } from '../context/KeyboardContext';

interface FocusStore {
  focusedId: string | null;
  focusableIds: string[];
  setFocused: (id: string | null) => void;
  registerFocusable: (id: string) => () => void;
  focusNext: () => void;
  focusPrev: () => void;
  isFocused: (id: string) => boolean;
}

const FocusStoreContext = createContext<FocusStore | null>(null);

/**
 * Provider for managing focusable components
 */
export function FocusStoreProvider({ children }: { children: ReactNode }) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [focusableIds, setFocusableIds] = useState<string[]>([]);

  const registerFocusable = useCallback((id: string) => {
    setFocusableIds(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });

    return () => {
      setFocusableIds(prev => prev.filter(fid => fid !== id));
      setFocusedId(current => current === id ? null : current);
    };
  }, []);

  const setFocused = useCallback((id: string | null) => {
    setFocusedId(id);
  }, []);

  const focusNext = useCallback(() => {
    setFocusedId(current => {
      if (focusableIds.length === 0) return null;
      if (!current) return focusableIds[0];
      const idx = focusableIds.indexOf(current);
      return focusableIds[(idx + 1) % focusableIds.length];
    });
  }, [focusableIds]);

  const focusPrev = useCallback(() => {
    setFocusedId(current => {
      if (focusableIds.length === 0) return null;
      if (!current) return focusableIds[focusableIds.length - 1];
      const idx = focusableIds.indexOf(current);
      return focusableIds[(idx - 1 + focusableIds.length) % focusableIds.length];
    });
  }, [focusableIds]);

  const isFocused = useCallback((id: string) => focusedId === id, [focusedId]);

  const value = useMemo<FocusStore>(() => ({
    focusedId,
    focusableIds,
    setFocused,
    registerFocusable,
    focusNext,
    focusPrev,
    isFocused,
  }), [focusedId, focusableIds, setFocused, registerFocusable, focusNext, focusPrev, isFocused]);

  return (
    <FocusStoreContext.Provider value={value}>
      {children}
    </FocusStoreContext.Provider>
  );
}

/**
 * Hook to access the focus store
 */
export function useFocusStore(): FocusStore {
  const context = useContext(FocusStoreContext);
  if (!context) {
    throw new Error('useFocusStore must be used within FocusStoreProvider');
  }
  return context;
}

interface FocusableProps {
  id: string;
  children: ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyPress?: (key: KeyEvent) => boolean | void;
  disabled?: boolean;
  focusStyle?: {
    borderColor?: string;
    backgroundColor?: string;
  };
  style?: Record<string, unknown>;
}

/**
 * Focusable component wrapper
 *
 * Wraps children in a focusable container that can receive keyboard events.
 */
export function Focusable({
  id,
  children,
  onFocus,
  onBlur,
  onKeyPress,
  disabled = false,
  focusStyle,
  style = {},
}: FocusableProps) {
  const { isFocused, registerFocusable } = useFocusStore();
  const focused = isFocused(id);

  // Register this component as focusable
  useMemo(() => {
    if (disabled) return;
    return registerFocusable(id);
  }, [id, disabled, registerFocusable]);

  // Handle focus callbacks
  useMemo(() => {
    if (focused) {
      onFocus?.();
    } else {
      onBlur?.();
    }
  }, [focused, onFocus, onBlur]);

  // Register keyboard handler when focused
  useKeyboardHandler(
    'focused',
    `focusable-${id}`,
    (key) => {
      if (!focused || disabled) return false;
      return onKeyPress?.(key);
    },
    [focused, disabled, onKeyPress]
  );

  // Apply focus styles
  const computedStyle = {
    ...style,
    ...(focused && focusStyle ? focusStyle : {}),
  };

  return (
    <box style={computedStyle}>
      {children}
    </box>
  );
}

/**
 * Hook for making a component focusable without the wrapper
 */
export function useFocusable(
  id: string,
  options: {
    onKeyPress?: (key: KeyEvent) => boolean | void;
    disabled?: boolean;
  } = {}
) {
  const { isFocused, registerFocusable, setFocused } = useFocusStore();
  const focused = isFocused(id);

  // Register on mount
  useMemo(() => {
    if (options.disabled) return;
    return registerFocusable(id);
  }, [id, options.disabled, registerFocusable]);

  // Register keyboard handler
  useKeyboardHandler(
    'focused',
    `focusable-${id}`,
    (key) => {
      if (!focused || options.disabled) return false;
      return options.onKeyPress?.(key);
    },
    [focused, options.disabled, options.onKeyPress]
  );

  return {
    focused,
    focus: () => setFocused(id),
    blur: () => setFocused(null),
  };
}
