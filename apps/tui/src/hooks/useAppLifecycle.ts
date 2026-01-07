/**
 * App Lifecycle Management Hook
 *
 * Provides proper cleanup on exit, ensuring mouse tracking is disabled
 * and terminal state is restored.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useRenderer } from '@opentui/react';

export interface AppLifecycleOptions {
  onBeforeExit?: () => void;
  onExit?: () => void;
}

/**
 * Hook for managing app lifecycle and proper cleanup on exit
 */
export function useAppLifecycle(options: AppLifecycleOptions = {}) {
  const renderer = useRenderer();
  const isCleaningUp = useRef(false);

  const cleanup = useCallback(() => {
    if (isCleaningUp.current) return;
    isCleaningUp.current = true;

    try {
      // Call user's before exit callback
      options.onBeforeExit?.();

      // Stop and destroy renderer to restore terminal state
      renderer.stop();
      renderer.destroy();

      // Call user's exit callback
      options.onExit?.();
    } catch {
      // Ignore cleanup errors
    }

    // Exit process
    process.exit(0);
  }, [renderer, options]);

  // Register signal handlers for external termination
  useEffect(() => {
    const handleSignal = () => cleanup();

    process.on('SIGINT', handleSignal);
    process.on('SIGTERM', handleSignal);

    return () => {
      process.off('SIGINT', handleSignal);
      process.off('SIGTERM', handleSignal);
    };
  }, [cleanup]);

  return {
    /**
     * Call this to exit the app with proper cleanup
     */
    exit: cleanup,

    /**
     * Check if cleanup is in progress
     */
    isExiting: () => isCleaningUp.current,
  };
}
