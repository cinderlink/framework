/**
 * Error Display Components
 *
 * Components for displaying errors gracefully in the TUI.
 */

import { Component, type ReactNode } from 'react';
import type { Colors } from '../theme';

interface ErrorDisplayProps {
  colors: Colors;
  title?: string;
  message: string;
  detail?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Error display panel for showing errors in views
 */
export function ErrorDisplay({
  colors,
  title = 'Error',
  message,
  detail,
  onRetry,
  onDismiss,
}: ErrorDisplayProps) {
  return (
    <box
      style={{
        flexDirection: 'column',
        border: true,
        borderColor: colors.accentRed,
        padding: 2,
        margin: 1,
      }}
    >
      <box style={{ flexDirection: 'row', marginBottom: 1 }}>
        <text fg={colors.accentRed}>✖ </text>
        <text fg={colors.accentRed}><b>{title}</b></text>
      </box>
      <box style={{ marginBottom: 1 }}>
        <text fg={colors.textPrimary}>{message}</text>
      </box>
      {detail && (
        <box style={{ marginBottom: 1 }}>
          <text fg={colors.textSecondary}>{detail}</text>
        </box>
      )}
      {(onRetry || onDismiss) && (
        <box style={{ flexDirection: 'row', marginTop: 1 }}>
          {onRetry && (
            <text fg={colors.accentBlue}>[r] Retry </text>
          )}
          {onDismiss && (
            <text fg={colors.textSecondary}>[Esc] Dismiss</text>
          )}
        </box>
      )}
    </box>
  );
}

/**
 * Inline error message for forms/inputs
 */
export function InlineError({
  colors,
  message,
}: {
  colors: Colors;
  message: string;
}) {
  return (
    <box style={{ flexDirection: 'row' }}>
      <text fg={colors.accentRed}>⚠ {message}</text>
    </box>
  );
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  colors: Colors;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

/**
 * React Error Boundary for catching render errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay
          colors={this.props.colors}
          title="Something went wrong"
          message={this.state.error?.message || 'An unexpected error occurred'}
          detail="The component failed to render properly."
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Empty state display for when there's no data
 */
export function EmptyState({
  colors,
  icon = '📭',
  title,
  message,
  action,
}: {
  colors: Colors;
  icon?: string;
  title: string;
  message?: string;
  action?: string;
}) {
  return (
    <box
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
        flexGrow: 1,
      }}
    >
      <text fg={colors.textSecondary}>{icon}</text>
      <box style={{ marginTop: 1 }}>
        <text fg={colors.textPrimary}><b>{title}</b></text>
      </box>
      {message && (
        <box style={{ marginTop: 1 }}>
          <text fg={colors.textSecondary}>{message}</text>
        </box>
      )}
      {action && (
        <box style={{ marginTop: 1 }}>
          <text fg={colors.accentBlue}>{action}</text>
        </box>
      )}
    </box>
  );
}

/**
 * Connection error specific display
 */
export function ConnectionError({
  colors,
  onRetry,
}: {
  colors: Colors;
  onRetry?: () => void;
}) {
  return (
    <ErrorDisplay
      colors={colors}
      title="Connection Error"
      message="Unable to connect to the network"
      detail="Check your network settings and bootstrap nodes configuration."
      onRetry={onRetry}
    />
  );
}
