/**
 * Keyboard Hints Component
 *
 * Context-sensitive keyboard shortcut hints for different views.
 */

import type { Colors } from '../theme';

type ViewType = 'dashboard' | 'peers' | 'logs' | 'database' | 'settings' | 'messaging';

interface KeyboardHint {
  key: string;
  action: string;
}

interface KeyboardHintsProps {
  colors: Colors;
  view: ViewType;
  isTextMode?: boolean;
  compact?: boolean;
}

const globalHints: KeyboardHint[] = [
  { key: 'Tab', action: 'Focus' },
  { key: '1-6', action: 'Views' },
  { key: 'Ctrl+P', action: 'Commands' },
  { key: '?', action: 'Help' },
  { key: 'q', action: 'Quit' },
];

const viewHints: Record<ViewType, KeyboardHint[]> = {
  dashboard: [
    { key: 'r', action: 'Refresh' },
  ],
  peers: [
    { key: '↑↓', action: 'Navigate' },
    { key: 'Enter', action: 'Details' },
    { key: 'd', action: 'Disconnect' },
    { key: 'a', action: 'Add peer' },
    { key: '/', action: 'Search' },
  ],
  logs: [
    { key: '↑↓', action: 'Scroll' },
    { key: '1-4', action: 'Filter level' },
    { key: '/', action: 'Search' },
    { key: 'c', action: 'Clear' },
    { key: 'e', action: 'Export' },
  ],
  database: [
    { key: '↑↓', action: 'Navigate' },
    { key: 'Enter', action: 'Expand' },
    { key: 't', action: 'Tree view' },
    { key: 'j', action: 'JSON view' },
    { key: 'd', action: 'Diff view' },
    { key: 'e', action: 'Export' },
  ],
  settings: [
    { key: '↑↓', action: 'Navigate' },
    { key: 'Enter', action: 'Toggle' },
    { key: 't', action: 'Theme' },
  ],
  messaging: [
    { key: 'Tab', action: 'Switch mode' },
    { key: '↑↓', action: 'Select peer/topic' },
    { key: 'Enter', action: 'Send' },
    { key: '/', action: 'Filter' },
  ],
};

const textModeHints: KeyboardHint[] = [
  { key: 'Esc', action: 'Exit input' },
  { key: 'Enter', action: 'Submit' },
];

/**
 * Format a single hint
 */
function HintItem({
  hint,
  colors,
  isLast,
}: {
  hint: KeyboardHint;
  colors: Colors;
  isLast: boolean;
}) {
  return (
    <box style={{ flexDirection: 'row' }}>
      <text fg={colors.accentBlue}>[{hint.key}]</text>
      <text fg={colors.textSecondary}> {hint.action}</text>
      {!isLast && <text fg={colors.textSecondary}> | </text>}
    </box>
  );
}

/**
 * Keyboard hints bar
 */
export function KeyboardHints({
  colors,
  view,
  isTextMode = false,
  compact = false,
}: KeyboardHintsProps) {
  const hints = isTextMode 
    ? textModeHints 
    : compact 
      ? viewHints[view].slice(0, 3)
      : [...viewHints[view], ...globalHints.slice(0, 2)];

  return (
    <box style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {hints.map((hint, idx) => (
        <HintItem
          key={hint.key}
          hint={hint}
          colors={colors}
          isLast={idx === hints.length - 1}
        />
      ))}
    </box>
  );
}

/**
 * Minimal hints for status bar
 */
export function StatusBarHints({ colors }: { colors: Colors }) {
  return (
    <box style={{ flexDirection: 'row' }}>
      <text fg={colors.textSecondary}>
        [Tab] Focus | [1-6] Views | [Ctrl+P] Commands | [?] Help | [q] Quit
      </text>
    </box>
  );
}

/**
 * View-specific action hints (shown at top of view)
 */
export function ViewActionHints({
  colors,
  view,
}: {
  colors: Colors;
  view: ViewType;
}) {
  const hints = viewHints[view];
  
  return (
    <box style={{ flexDirection: 'row' }}>
      {hints.slice(0, 4).map((hint, idx) => (
        <HintItem
          key={hint.key}
          hint={hint}
          colors={colors}
          isLast={idx === Math.min(3, hints.length - 1)}
        />
      ))}
    </box>
  );
}
