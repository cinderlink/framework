/**
 * Command Palette Component
 *
 * A quick access command palette (Ctrl+P) for navigating views and executing actions.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useKeyboard } from '@opentui/react';

export interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category: 'navigation' | 'action' | 'setting';
  action: () => void;
}

interface CommandPaletteProps {
  colors: typeof import('../theme/colors').colors.dark;
  visible: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ colors, visible, onClose, commands }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return commands;
    }

    const query = searchQuery.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(query) ||
      cmd.description?.toLowerCase().includes(query) ||
      cmd.category.toLowerCase().includes(query)
    );
  }, [commands, searchQuery]);

  // Reset state when opened/closed
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [visible]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const executeCommand = useCallback(() => {
    const cmd = filteredCommands[selectedIndex];
    if (cmd) {
      cmd.action();
      onClose();
    }
  }, [filteredCommands, selectedIndex, onClose]);

  useKeyboard((...args: unknown[]) => {
    if (!visible) return;

    const key = (args[1] || args[0]) as { name?: string; ctrl?: boolean } | undefined;
    if (!key) return;

    // Close on Escape
    if (key.name === 'escape') {
      onClose();
      return;
    }

    // Navigate with up/down
    if (key.name === 'up') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.name === 'down') {
      setSelectedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
      return;
    }

    // Execute on Enter
    if (key.name === 'return') {
      executeCommand();
      return;
    }
  });

  if (!visible) return null;

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {
      navigation: [],
      action: [],
      setting: [],
    };

    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'navigation': return 'Navigation';
      case 'action': return 'Actions';
      case 'setting': return 'Settings';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation': return colors.accentBlue;
      case 'action': return colors.accentGreen;
      case 'setting': return colors.accentYellow;
      default: return colors.textSecondary;
    }
  };

  // Flatten for index calculation
  let flatIndex = 0;
  const renderCategories = Object.entries(groupedCommands)
    .filter(([_, cmds]) => cmds.length > 0)
    .map(([category, cmds]) => {
      const categoryCommands = cmds.map(cmd => {
        const isSelected = filteredCommands.indexOf(cmd) === selectedIndex;
        flatIndex++;
        return (
          <box
            key={cmd.id}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 1,
              border: isSelected,
              borderColor: isSelected ? colors.accentBlue : colors.border,
              backgroundColor: isSelected ? colors.panelBackground : undefined,
            }}
          >
            <box style={{ flexDirection: 'row' }}>
              {isSelected && <text fg={colors.accentBlue}>{'> '}</text>}
              <text fg={isSelected ? colors.textPrimary : colors.textSecondary}>
                {cmd.label}
              </text>
              {cmd.description && (
                <box style={{ marginLeft: 1 }}>
                  <text fg={colors.textSecondary}>- {cmd.description}</text>
                </box>
              )}
            </box>
            {cmd.shortcut && (
              <text fg={colors.textSecondary}>[{cmd.shortcut}]</text>
            )}
          </box>
        );
      });

      return (
        <box key={category} style={{ flexDirection: 'column', marginBottom: 1 }}>
          <text fg={getCategoryColor(category)}>
            <b>{getCategoryLabel(category)}</b>
          </text>
          {categoryCommands}
        </box>
      );
    });

  return (
    <box
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 2,
      }}
    >
      <box
        style={{
          width: '60%',
          maxHeight: '80%',
          border: true,
          borderColor: colors.accentBlue,
          flexDirection: 'column',
          padding: 1,
        }}
      >
        {/* Header */}
        <box style={{ marginBottom: 1 }}>
          <text fg={colors.accentBlue}>
            <b>Command Palette</b>
          </text>
          <text fg={colors.textSecondary}> - Type to search, [↑↓] navigate, [Enter] select, [ESC] close</text>
        </box>

        {/* Search Input */}
        <box
          style={{
            border: true,
            borderColor: colors.accentGreen,
            marginBottom: 1,
          }}
        >
          <box style={{ flexDirection: 'row' }}>
            <text fg={colors.accentGreen}>{'>  '}</text>
            <input
              placeholder="Type to search commands..."
              value={searchQuery}
              onInput={(value: string) => setSearchQuery(value)}
              focused={visible}
            />
          </box>
        </box>

        {/* Commands List */}
        <scrollbox style={{ flexGrow: 1, flexDirection: 'column' }}>
          {filteredCommands.length === 0 ? (
            <box style={{ padding: 2, justifyContent: 'center' }}>
              <text fg={colors.textSecondary}>No commands match "{searchQuery}"</text>
            </box>
          ) : (
            <box style={{ flexDirection: 'column' }}>
              {renderCategories}
            </box>
          )}
        </scrollbox>

        {/* Footer */}
        <box style={{ marginTop: 1 }}>
          <text fg={colors.textSecondary}>
            {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''} available
          </text>
        </box>
      </box>
    </box>
  );
}

type View = 'dashboard' | 'peers' | 'logs' | 'database' | 'settings' | 'messaging';

/**
 * Default commands for the TUI
 */
export function createDefaultCommands(
  dispatch: (action: { type: 'SET_VIEW'; payload: View }) => void,
  actions: {
    toggleHelp: () => void;
    clearLogs?: () => void;
    exportLogs?: () => void;
  }
): Command[] {
  return [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'View system overview',
      shortcut: '1',
      category: 'navigation',
      action: () => dispatch({ type: 'SET_VIEW', payload: 'dashboard' }),
    },
    {
      id: 'nav-peers',
      label: 'Go to Peers',
      description: 'Manage peer connections',
      shortcut: '2',
      category: 'navigation',
      action: () => dispatch({ type: 'SET_VIEW', payload: 'peers' }),
    },
    {
      id: 'nav-logs',
      label: 'Go to Logs',
      description: 'View system logs',
      shortcut: '3',
      category: 'navigation',
      action: () => dispatch({ type: 'SET_VIEW', payload: 'logs' }),
    },
    {
      id: 'nav-database',
      label: 'Go to Database',
      description: 'Browse IPLD data',
      shortcut: '4',
      category: 'navigation',
      action: () => dispatch({ type: 'SET_VIEW', payload: 'database' }),
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      description: 'Configure TUI options',
      shortcut: '5',
      category: 'navigation',
      action: () => dispatch({ type: 'SET_VIEW', payload: 'settings' }),
    },
    {
      id: 'nav-messaging',
      label: 'Go to Messaging',
      description: 'Test P2P/Pubsub messages',
      shortcut: '6',
      category: 'navigation',
      action: () => dispatch({ type: 'SET_VIEW', payload: 'messaging' }),
    },
    // Actions
    {
      id: 'action-help',
      label: 'Show Help',
      description: 'Display keyboard shortcuts',
      shortcut: '?',
      category: 'action',
      action: actions.toggleHelp,
    },
    ...(actions.clearLogs ? [{
      id: 'action-clear-logs',
      label: 'Clear Logs',
      description: 'Remove all log entries',
      category: 'action' as const,
      action: actions.clearLogs,
    }] : []),
    ...(actions.exportLogs ? [{
      id: 'action-export-logs',
      label: 'Export Logs',
      description: 'Export logs to console',
      category: 'action' as const,
      action: actions.exportLogs,
    }] : []),
  ];
}
