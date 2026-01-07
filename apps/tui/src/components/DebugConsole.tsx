/**
 * Debug Console Component
 *
 * Provides a debug overlay that captures console output and displays it
 * in a TUI panel. Uses OpenTUI's renderer console for capturing logs.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRenderer, useKeyboard } from '@opentui/react';
import { PanelContainer } from './Layout/PanelContainer';

interface ConsoleEntry {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  args?: unknown[];
}

interface DebugConsoleProps {
  colors: typeof import('../theme/colors').colors.dark;
  visible: boolean;
  onClose: () => void;
  maxEntries?: number;
}

/**
 * Debug Console Overlay
 *
 * Captures and displays console output in the TUI.
 * Toggle with Ctrl+` (backtick) when enabled.
 */
export function DebugConsole({
  colors,
  visible,
  onClose,
  maxEntries = 100,
}: DebugConsoleProps) {
  const renderer = useRenderer();
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [filter, setFilter] = useState<'all' | ConsoleEntry['type']>('all');
  const [paused, setPaused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Capture console methods
  useEffect(() => {
    if (!visible) return;

    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    const createInterceptor = (type: ConsoleEntry['type']) => {
      return (...args: unknown[]) => {
        // Call original
        originalConsole[type](...args);

        // Don't capture if paused
        if (paused) return;

        // Add to entries
        const entry: ConsoleEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type,
          message: args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '),
          timestamp: new Date(),
          args,
        };

        setEntries(prev => {
          const next = [...prev, entry];
          // Trim to max entries
          if (next.length > maxEntries) {
            return next.slice(-maxEntries);
          }
          return next;
        });
      };
    };

    // Intercept console methods
    console.log = createInterceptor('log');
    console.info = createInterceptor('info');
    console.warn = createInterceptor('warn');
    console.error = createInterceptor('error');
    console.debug = createInterceptor('debug');

    // Restore on cleanup
    return () => {
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.debug = originalConsole.debug;
    };
  }, [visible, paused, maxEntries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => e.type === filter);
  }, [entries, filter]);

  // Keyboard handling
  useKeyboard((...args: unknown[]) => {
    if (!visible) return;

    const key = (args[1] || args[0]) as { name?: string; ctrl?: boolean } | undefined;
    if (!key) return;

    // Close on Escape
    if (key.name === 'escape') {
      onClose();
      return;
    }

    // Clear logs
    if (key.name === 'c' && key.ctrl) {
      setEntries([]);
      return;
    }

    // Toggle pause
    if (key.name === 'p') {
      setPaused(prev => !prev);
      return;
    }

    // Filter shortcuts
    if (key.name === '0') setFilter('all');
    if (key.name === '1') setFilter('error');
    if (key.name === '2') setFilter('warn');
    if (key.name === '3') setFilter('info');
    if (key.name === '4') setFilter('log');
    if (key.name === '5') setFilter('debug');

    // Navigation
    if (key.name === 'up' && selectedIndex !== null) {
      setSelectedIndex(prev => Math.max(0, (prev ?? 0) - 1));
    }
    if (key.name === 'down') {
      if (selectedIndex === null) {
        setSelectedIndex(0);
      } else {
        setSelectedIndex(prev => Math.min(filteredEntries.length - 1, (prev ?? 0) + 1));
      }
    }

    // Jump to bottom (latest)
    if (key.name === 'G' || (key.name === 'g' && key.ctrl)) {
      setSelectedIndex(filteredEntries.length - 1);
    }
  });

  const clearEntries = useCallback(() => {
    setEntries([]);
    setSelectedIndex(null);
  }, []);

  const getTypeColor = (type: ConsoleEntry['type']) => {
    switch (type) {
      case 'error': return colors.accentRed;
      case 'warn': return colors.accentYellow;
      case 'info': return colors.accentBlue;
      case 'debug': return colors.textSecondary;
      default: return colors.textPrimary;
    }
  };

  const getTypeIcon = (type: ConsoleEntry['type']) => {
    switch (type) {
      case 'error': return '✖';
      case 'warn': return '⚠';
      case 'info': return 'ℹ';
      case 'debug': return '⚙';
      default: return '●';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    } as Intl.DateTimeFormatOptions);
  };

  if (!visible) return null;

  return (
    <box
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
      }}
    >
      <box
        style={{
          width: '90%',
          height: '80%',
          border: true,
          borderColor: colors.accentYellow,
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <box
          style={{
            height: 3,
            borderColor: colors.border,
            padding: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <box style={{ flexDirection: 'row', alignItems: 'center' }}>
            <text fg={colors.accentYellow}><b>Debug Console</b></text>
            <text fg={colors.textSecondary}> ({filteredEntries.length} entries)</text>
            {paused && <text fg={colors.accentRed}> [PAUSED]</text>}
          </box>
          <text fg={colors.textSecondary}>[ESC] Close [Ctrl+C] Clear [p] Pause</text>
        </box>

        {/* Filter bar */}
        <box style={{ height: 2, padding: 1, flexDirection: 'row' }}>
          <text fg={colors.textSecondary}>Filter: </text>
          {(['all', 'error', 'warn', 'info', 'log', 'debug'] as const).map((type, idx) => (
            <box key={type} style={{ marginRight: 1 }}>
              <text fg={filter === type ? getTypeColor(type === 'all' ? 'log' : type) : colors.textSecondary}>
                {filter === type ? <b>[{idx}:{type}]</b> : `[${idx}:${type}]`}
              </text>
            </box>
          ))}
        </box>

        {/* Console output */}
        <box style={{ flexGrow: 1, padding: 1 }}>
          <scrollbox style={{ flexGrow: 1, flexDirection: 'column' }} showScrollIndicator={true}>
            {filteredEntries.length === 0 ? (
              <box style={{ justifyContent: 'center', padding: 2 }}>
                <text fg={colors.textSecondary}>
                  <i>No console output captured. Console messages will appear here.</i>
                </text>
              </box>
            ) : (
              filteredEntries.map((entry, idx) => (
                <box
                  key={entry.id}
                  style={{
                    flexDirection: 'row',
                    marginBottom: 1,
                    border: idx === selectedIndex,
                    borderColor: idx === selectedIndex ? colors.accentBlue : undefined,
                    padding: idx === selectedIndex ? 1 : 0,
                  }}
                >
                  {/* Selection indicator */}
                  {idx === selectedIndex && <text fg={colors.accentBlue}>{'> '}</text>}

                  {/* Type icon */}
                  <text fg={getTypeColor(entry.type)}>{getTypeIcon(entry.type)} </text>

                  {/* Timestamp */}
                  <text fg={colors.textSecondary}>[{formatTime(entry.timestamp)}] </text>

                  {/* Type badge */}
                  <text fg={getTypeColor(entry.type)}>
                    <b>[{entry.type.toUpperCase().padEnd(5)}]</b>
                  </text>
                  <text fg={getTypeColor(entry.type)}> </text>

                  {/* Message */}
                  <text fg={colors.textPrimary}>
                    {idx === selectedIndex
                      ? entry.message
                      : entry.message.slice(0, 100) + (entry.message.length > 100 ? '...' : '')}
                  </text>
                </box>
              ))
            )}
          </scrollbox>
        </box>

        {/* Footer */}
        <box style={{ height: 2, padding: 1 }}>
          <text fg={colors.textSecondary}>
            [0-5] Filter | [Up/Down] Navigate | [G] Jump to latest | Console capture is {paused ? 'paused' : 'active'}
          </text>
        </box>
      </box>
    </box>
  );
}

/**
 * Hook to manage debug console state
 */
export function useDebugConsole() {
  const [visible, setVisible] = useState(false);

  const toggle = useCallback(() => setVisible(prev => !prev), []);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  // Global keyboard shortcut for debug console (Ctrl+`)
  useKeyboard((...args: unknown[]) => {
    const key = (args[1] || args[0]) as { name?: string; ctrl?: boolean } | undefined;
    if (!key) return;

    // Toggle with Ctrl+` (backtick)
    if (key.ctrl && key.name === '`') {
      toggle();
    }
  });

  return { visible, toggle, show, hide };
}
