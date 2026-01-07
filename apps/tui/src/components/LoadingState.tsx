/**
 * Loading State Component
 *
 * Displays loading indicators with optional messages and progress.
 */

import type { Colors } from '../theme';

interface LoadingStateProps {
  colors: Colors;
  message?: string;
  detail?: string;
  showSpinner?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function LoadingState({
  colors,
  message = 'Loading...',
  detail,
  showSpinner = true,
  size = 'medium',
}: LoadingStateProps) {
  // Use a simple static spinner for now (animation would need useEffect/interval)
  const spinner = spinnerFrames[0];
  
  const padding = size === 'small' ? 1 : size === 'large' ? 3 : 2;

  return (
    <box
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        flexGrow: 1,
      }}
    >
      <box style={{ flexDirection: 'row', alignItems: 'center' }}>
        {showSpinner && (
          <text fg={colors.accentBlue}>{spinner} </text>
        )}
        <text fg={colors.textPrimary}>{message}</text>
      </box>
      {detail && (
        <box style={{ marginTop: 1 }}>
          <text fg={colors.textSecondary}>{detail}</text>
        </box>
      )}
    </box>
  );
}

/**
 * Inline loading indicator for use within other components
 */
export function InlineLoading({
  colors,
  message,
}: {
  colors: Colors;
  message?: string;
}) {
  return (
    <box style={{ flexDirection: 'row', alignItems: 'center' }}>
      <text fg={colors.accentBlue}>⠋ </text>
      {message && <text fg={colors.textSecondary}>{message}</text>}
    </box>
  );
}

/**
 * Skeleton loader for content placeholders
 */
export function SkeletonLine({
  colors,
  width = 20,
}: {
  colors: Colors;
  width?: number;
}) {
  const line = '░'.repeat(width);
  return <text fg={colors.textSecondary}>{line}</text>;
}

/**
 * Skeleton loader for lists
 */
export function SkeletonList({
  colors,
  rows = 3,
  lineWidth = 30,
}: {
  colors: Colors;
  rows?: number;
  lineWidth?: number;
}) {
  return (
    <box style={{ flexDirection: 'column' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <box key={i} style={{ marginBottom: 1 }}>
          <SkeletonLine colors={colors} width={lineWidth - (i % 3) * 5} />
        </box>
      ))}
    </box>
  );
}
