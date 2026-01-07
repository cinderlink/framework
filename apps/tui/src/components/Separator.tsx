/**
 * Separator Component
 *
 * Provides consistent spacing between inline elements in flex rows.
 */

interface SeparatorProps {
  color?: string;
  char?: string;
}

/**
 * Vertical separator with margins for consistent spacing in flex rows
 */
export function Separator({ color = '#666666', char = '│' }: SeparatorProps) {
  return (
    <box style={{ marginLeft: 1, marginRight: 1 }}>
      <text fg={color}>{char}</text>
    </box>
  );
}

/**
 * Simple horizontal spacer
 */
export function Spacer({ width = 1 }: { width?: number }) {
  return <box style={{ width }} />;
}
