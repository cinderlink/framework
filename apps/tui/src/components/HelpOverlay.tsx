/**
 * Keyboard Shortcuts Help Overlay
 *
 * Shows all available keyboard shortcuts when user presses '?'
 */

import { useKeyboard } from '@opentui/react';

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string;
    description: string;
  }>;
}

interface HelpOverlayProps {
  colors: typeof import('../theme/colors').colors.dark;
  visible: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: '1-6', description: 'Switch between views' },
      { keys: 'Tab', description: 'Next focus zone' },
      { keys: 'Shift+Tab', description: 'Previous focus zone' },
      { keys: 'Esc', description: 'Exit input mode / Close overlay' },
    ],
  },
  {
    title: 'Global',
    shortcuts: [
      { keys: 'Ctrl+P', description: 'Open command palette' },
      { keys: '?', description: 'Show/hide this help' },
      { keys: 'q', description: 'Quit application' },
      { keys: 'Ctrl+C', description: 'Force quit' },
    ],
  },
  {
    title: 'Logs View',
    shortcuts: [
      { keys: '/', description: 'Search logs' },
      { keys: '0-4', description: 'Filter by level (ALL/ERR/WARN/INFO/DEBUG)' },
      { keys: 'c', description: 'Clear logs' },
      { keys: 'e', description: 'Export logs' },
      { keys: 'a', description: 'Toggle auto-scroll' },
    ],
  },
  {
    title: 'Peers View',
    shortcuts: [
      { keys: '/', description: 'Search peers' },
      { keys: 'a', description: 'Add peer' },
      { keys: 'Up/Down', description: 'Select peer' },
      { keys: 'd', description: 'Disconnect selected peer' },
    ],
  },
  {
    title: 'Messaging View',
    shortcuts: [
      { keys: 't', description: 'Edit topic' },
      { keys: 'p', description: 'Edit payload' },
      { keys: 'Enter', description: 'Send message' },
      { keys: 'Tab', description: 'Toggle P2P/Pubsub mode' },
      { keys: 'f', description: 'Cycle history filter' },
      { keys: 'j/k', description: 'Navigate history' },
      { keys: 'e', description: 'Expand message details' },
      { keys: 'c', description: 'Clear history' },
    ],
  },
  {
    title: 'Settings View',
    shortcuts: [
      { keys: 'Up/Down', description: 'Navigate settings' },
      { keys: 'Enter', description: 'Edit setting' },
      { keys: 's', description: 'Save settings' },
    ],
  },
];

export function HelpOverlay({ colors, visible, onClose }: HelpOverlayProps) {
  useKeyboard((...args: unknown[]) => {
    if (!visible) return;

    const key = (args[1] || args[0]) as { name?: string } | undefined;
    if (!key) return;

    // Close on Escape or ?
    if (key.name === 'escape' || key.name === '?') {
      onClose();
    }
  });

  if (!visible) return null;

  return (
    <box
      style={{
        position: 'absolute',
        top: 2,
        left: 4,
        right: 4,
        bottom: 2,
        border: true,
        borderColor: colors.accentBlue,
        flexDirection: 'column',
        padding: 1,
      }}
    >
      {/* Header */}
      <box style={{ height: 2, marginBottom: 1 }}>
        <text fg={colors.accentBlue}><b>Keyboard Shortcuts</b></text>
        <text fg={colors.textSecondary}> (press ? or Esc to close)</text>
      </box>

      {/* Shortcut Groups in scrollable area */}
      <scrollbox style={{ flexGrow: 1, flexDirection: 'column' }}>
        {SHORTCUT_GROUPS.map((group, groupIdx) => (
          <box key={group.title} style={{ flexDirection: 'column', marginBottom: 1 }}>
            {/* Group title */}
            <box style={{ height: 1, marginBottom: 1 }}>
              <text fg={colors.accentYellow}><b>{group.title}</b></text>
            </box>

            {/* Shortcuts in group */}
            {group.shortcuts.map((shortcut, idx) => (
              <box key={idx} style={{ flexDirection: 'row', height: 1 }}>
                <box style={{ width: 16 }}>
                  <text fg={colors.accentGreen}><b>{shortcut.keys.padEnd(14)}</b></text>
                </box>
                <text fg={colors.textPrimary}>{shortcut.description}</text>
              </box>
            ))}

            {/* Separator between groups (except last) */}
            {groupIdx < SHORTCUT_GROUPS.length - 1 && (
              <box style={{ height: 1 }}>
                <text fg={colors.border}>{'─'.repeat(40)}</text>
              </box>
            )}
          </box>
        ))}
      </scrollbox>

      {/* Footer */}
      <box style={{ height: 1, marginTop: 1 }}>
        <text fg={colors.textSecondary}>
          Tip: Shortcuts work when not in input mode. Press Esc to exit input mode.
        </text>
      </box>
    </box>
  );
}
