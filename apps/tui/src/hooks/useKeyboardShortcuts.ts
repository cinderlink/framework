import { useEffect, useCallback } from 'react';
import { ViewAction } from './useViewState';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
}

export function useKeyboardShortcuts(
  dispatch: (action: ViewAction) => void,
  shortcuts: KeyboardShortcut[]
): void {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const { key, ctrl, shift, alt, action } = shortcut;
      
      const keyMatch = event.key.toLowerCase() === key.toLowerCase();
      const ctrlMatch = ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shift ? event.shiftKey : !event.shiftKey;
      const altMatch = alt ? event.altKey : !event.altKey;
      
      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        action();
        return;
      }
    }
  }, [shortcuts]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export const defaultShortcuts: KeyboardShortcut[] = [
  { key: '1', action: () => {} },
  { key: '2', action: () => {} },
  { key: '3', action: () => {} },
  { key: '4', action: () => {} },
  { key: '5', action: () => {} },
];