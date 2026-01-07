/**
 * Input Mode Context
 *
 * Tracks whether the application is in "command" mode (keyboard shortcuts active)
 * or "text" mode (input fields capture all typing).
 *
 * This allows global shortcuts to be disabled when the user is typing in an input.
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

export type InputMode = 'command' | 'text';

interface InputModeContextValue {
  /**
   * Current input mode
   */
  mode: InputMode;

  /**
   * Whether we're currently in text input mode
   */
  isTextMode: boolean;

  /**
   * Whether we're currently in command mode
   */
  isCommandMode: boolean;

  /**
   * Enter text input mode (call when focusing an input)
   */
  enterTextMode: (inputId?: string) => void;

  /**
   * Exit text input mode (call when blurring an input)
   */
  exitTextMode: () => void;

  /**
   * The ID of the currently active input (if any)
   */
  activeInputId: string | null;
}

const InputModeContext = createContext<InputModeContextValue | null>(null);

export function InputModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<InputMode>('command');
  const [activeInputId, setActiveInputId] = useState<string | null>(null);

  const enterTextMode = useCallback((inputId?: string) => {
    setMode('text');
    setActiveInputId(inputId || null);
  }, []);

  const exitTextMode = useCallback(() => {
    setMode('command');
    setActiveInputId(null);
  }, []);

  const value = useMemo<InputModeContextValue>(() => ({
    mode,
    isTextMode: mode === 'text',
    isCommandMode: mode === 'command',
    enterTextMode,
    exitTextMode,
    activeInputId,
  }), [mode, enterTextMode, exitTextMode, activeInputId]);

  return (
    <InputModeContext.Provider value={value}>
      {children}
    </InputModeContext.Provider>
  );
}

/**
 * Hook to access input mode context
 */
export function useInputMode(): InputModeContextValue {
  const context = useContext(InputModeContext);
  if (!context) {
    throw new Error('useInputMode must be used within InputModeProvider');
  }
  return context;
}

/**
 * Hook for input components to manage their text mode state
 *
 * Call onFocus when the input gains focus, onBlur when it loses focus.
 * This will automatically manage the global input mode.
 */
export function useTextInput(inputId: string) {
  const { enterTextMode, exitTextMode, activeInputId } = useInputMode();

  const isActive = activeInputId === inputId;

  const onFocus = useCallback(() => {
    enterTextMode(inputId);
  }, [enterTextMode, inputId]);

  const onBlur = useCallback(() => {
    exitTextMode();
  }, [exitTextMode]);

  return {
    isActive,
    onFocus,
    onBlur,
  };
}
