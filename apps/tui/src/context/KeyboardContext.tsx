/**
 * Centralized Keyboard Context
 *
 * Provides a single bridge to OpenTUI's keyboard handling with layer-based
 * priority system. Components register handlers at specific layers, and
 * the keyboard provider processes them in order.
 *
 * Layer Priority (highest to lowest):
 * 1. system - Critical system shortcuts (Ctrl+C, etc.)
 * 2. modal - Modal dialogs that capture all input
 * 3. overlay - Overlays like help screen, command palette
 * 4. global - Global shortcuts (number keys for views, etc.)
 * 5. zone - Focus zone specific handlers
 * 6. focused - Currently focused component handlers
 */

import { createContext, useContext, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useKeyboard } from '@opentui/react';

export type KeyboardLayer = 'system' | 'modal' | 'overlay' | 'global' | 'zone' | 'focused';

export interface KeyEvent {
  name?: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
  alt?: boolean;
  sequence?: string;
}

export type KeyHandler = (key: KeyEvent) => boolean | void;

interface LayerHandler {
  id: string;
  handler: KeyHandler;
  priority?: number;
}

interface KeyboardContextValue {
  /**
   * Register a key handler at a specific layer
   * @returns Unregister function
   */
  registerHandler: (layer: KeyboardLayer, id: string, handler: KeyHandler, priority?: number) => () => void;

  /**
   * Unregister a handler by layer and id
   */
  unregisterHandler: (layer: KeyboardLayer, id: string) => void;

  /**
   * Check if a layer is currently blocking input
   */
  isLayerBlocking: (layer: KeyboardLayer) => boolean;

  /**
   * Set whether a layer should block lower layers
   */
  setLayerBlocking: (layer: KeyboardLayer, blocking: boolean) => void;
}

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

const LAYER_ORDER: KeyboardLayer[] = ['system', 'modal', 'overlay', 'global', 'zone', 'focused'];

export function KeyboardProvider({ children }: { children: ReactNode }) {
  // Handlers organized by layer
  const handlers = useRef<Record<KeyboardLayer, LayerHandler[]>>({
    system: [],
    modal: [],
    overlay: [],
    global: [],
    zone: [],
    focused: [],
  });

  // Track which layers block input propagation
  const blockingLayers = useRef<Set<KeyboardLayer>>(new Set());

  const registerHandler = useCallback((
    layer: KeyboardLayer,
    id: string,
    handler: KeyHandler,
    priority = 0
  ): (() => void) => {
    // Remove existing handler with same id if present
    handlers.current[layer] = handlers.current[layer].filter(h => h.id !== id);

    // Add new handler
    handlers.current[layer].push({ id, handler, priority });

    // Sort by priority (higher first)
    handlers.current[layer].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Return unregister function
    return () => {
      handlers.current[layer] = handlers.current[layer].filter(h => h.id !== id);
    };
  }, []);

  const unregisterHandler = useCallback((layer: KeyboardLayer, id: string) => {
    handlers.current[layer] = handlers.current[layer].filter(h => h.id !== id);
  }, []);

  const isLayerBlocking = useCallback((layer: KeyboardLayer): boolean => {
    return blockingLayers.current.has(layer);
  }, []);

  const setLayerBlocking = useCallback((layer: KeyboardLayer, blocking: boolean) => {
    if (blocking) {
      blockingLayers.current.add(layer);
    } else {
      blockingLayers.current.delete(layer);
    }
  }, []);

  // Single keyboard hook that dispatches to registered handlers
  useKeyboard((...args: unknown[]) => {
    const key = (args[1] || args[0]) as KeyEvent | undefined;
    if (!key) return;

    // Process layers in priority order
    for (const layer of LAYER_ORDER) {
      const layerHandlers = handlers.current[layer];

      for (const { handler } of layerHandlers) {
        const handled = handler(key);

        // If handler returns true, stop propagation
        if (handled === true) {
          return;
        }
      }

      // If this layer is blocking, stop here
      if (blockingLayers.current.has(layer) && layerHandlers.length > 0) {
        return;
      }
    }
  });

  const value = useMemo<KeyboardContextValue>(() => ({
    registerHandler,
    unregisterHandler,
    isLayerBlocking,
    setLayerBlocking,
  }), [registerHandler, unregisterHandler, isLayerBlocking, setLayerBlocking]);

  return (
    <KeyboardContext.Provider value={value}>
      {children}
    </KeyboardContext.Provider>
  );
}

/**
 * Hook to access keyboard context
 */
export function useKeyboardContext(): KeyboardContextValue {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboardContext must be used within KeyboardProvider');
  }
  return context;
}

/**
 * Hook to register a keyboard handler at a specific layer
 *
 * @param layer - The layer to register at
 * @param id - Unique identifier for this handler
 * @param handler - The key handler function (return true to stop propagation)
 * @param deps - Dependencies for the handler
 */
export function useKeyboardHandler(
  layer: KeyboardLayer,
  id: string,
  handler: KeyHandler,
  deps: unknown[] = []
) {
  const { registerHandler } = useKeyboardContext();

  // Memoize handler and register
  const memoizedHandler = useCallback(handler, deps);

  // Use a ref to track cleanup
  const cleanupRef = useRef<(() => void) | null>(null);

  // Register on mount, cleanup on unmount
  useMemo(() => {
    // Cleanup previous registration
    cleanupRef.current?.();

    // Register new handler
    cleanupRef.current = registerHandler(layer, id, memoizedHandler);

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [layer, id, memoizedHandler, registerHandler]);
}

/**
 * Hook to set a layer as blocking while mounted
 */
export function useBlockingLayer(layer: KeyboardLayer, blocking = true) {
  const { setLayerBlocking } = useKeyboardContext();

  useMemo(() => {
    if (blocking) {
      setLayerBlocking(layer, true);
      return () => setLayerBlocking(layer, false);
    }
  }, [layer, blocking, setLayerBlocking]);
}
