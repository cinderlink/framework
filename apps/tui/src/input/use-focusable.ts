/**
 * useFocusable Hook
 *
 * Provides focus management for individual UI elements.
 * Registers the element with the focus store and provides focus state.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFocusStore, type FocusReason } from './focus-store';

/**
 * Simple hash function to generate stable order values from IDs
 */
function hashCode(str: string): number {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 10000;
}

export interface UseFocusableOptions {
  /** Unique identifier for this focusable element */
  id: string;
  /** Zone for grouping focusable elements (default: 'content') */
  zone?: string;
  /** Explicit order for Tab navigation (lower = earlier) */
  order?: number;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Is this a text input field? (affects keyboard behavior) */
  isTextInput?: boolean;
  /** Callback when element is activated (Enter/Space) */
  onActivate?: () => void;
  /** Whether this element is focusable (default: true) */
  enabled?: boolean;
  /** Include in Tab navigation (default: true) */
  tabNavigable?: boolean;
}

export interface UseFocusableReturn {
  /** Whether this element is currently focused */
  focused: boolean;
  /** The reason for the current focus state */
  focusReason: FocusReason;
  /** Set focus to this element */
  focus: () => void;
  /** Remove focus from this element */
  blur: () => void;
}

export function useFocusable({
  id,
  zone = 'content',
  order,
  autoFocus = false,
  isTextInput = false,
  onActivate,
  enabled = true,
  tabNavigable = true,
}: UseFocusableOptions): UseFocusableReturn {
  const activateRef = useRef(onActivate);

  // Get store actions
  const register = useFocusStore((state) => state.register);
  const setFocused = useFocusStore((state) => state.setFocused);
  const clearFocus = useFocusStore((state) => state.clearFocus);

  // Keep activateRef updated
  useEffect(() => {
    activateRef.current = onActivate;
  }, [onActivate]);

  // Compute order deterministically
  const computedOrder = useMemo(() => {
    if (typeof order === 'number') return order;
    // Use stable hash-based ordering as fallback
    return 10000 + hashCode(id);
  }, [order, id]);

  // Register/unregister on mount/unmount
  useEffect(() => {
    if (!enabled) return;

    const unregister = register({
      id,
      zone,
      order: computedOrder,
      isTextInput,
      tabNavigable,
      onActivate: () => {
        activateRef.current?.();
      },
    });

    if (autoFocus) {
      setFocused(id, 'programmatic');
    }

    return unregister;
  }, [id, zone, computedOrder, enabled, autoFocus, isTextInput, tabNavigable, register, setFocused]);

  // Subscribe to focus state
  const focused = useFocusStore((state) => state.focusedId === id);
  const focusReason = useFocusStore((state) => state.reason);

  const focus = useMemo(() => () => setFocused(id, 'programmatic'), [id, setFocused]);
  const blur = useMemo(() => () => {
    const state = useFocusStore.getState();
    if (state.focusedId === id) {
      clearFocus();
    }
  }, [id, clearFocus]);

  return { focused, focusReason, focus, blur };
}

/**
 * Focus an element by ID from outside React
 */
export function focusElement(id: string, reason: FocusReason = 'programmatic') {
  useFocusStore.getState().setFocused(id, reason);
}
