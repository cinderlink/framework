/**
 * Runtime Context for React Components
 *
 * Provides access to the CLI runtime context from React components.
 */

import { createContext, useContext } from 'react';
import type { RuntimeContext } from '../cli/context';

// Create a context for runtime context
export const RuntimeContextReact = createContext<RuntimeContext | null>(null);

/**
 * Hook to access the runtime context from React components
 */
export function useRuntimeContext(): RuntimeContext {
  const context = useContext(RuntimeContextReact);
  if (!context) {
    throw new Error('useRuntimeContext must be used within RuntimeContextReact.Provider');
  }
  return context;
}

/**
 * Hook to check if we have runtime context (for optional usage)
 */
export function useHasRuntimeContext(): boolean {
  const context = useContext(RuntimeContextReact);
  return context !== null;
}

/**
 * Hook to optionally get runtime context
 */
export function useOptionalRuntimeContext(): RuntimeContext | null {
  return useContext(RuntimeContextReact);
}
