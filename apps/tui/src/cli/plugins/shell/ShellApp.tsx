/**
 * Shell Application Component
 *
 * Wraps the TUI App with context from the CLI.
 * This is the entry point for the shell command.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import type { RuntimeContext } from '../../context';
import { App } from '../../../App';
import { AppProviders } from '../../../AppProviders';
import { RuntimeContextReact } from '../../../context/RuntimeContext';

// Re-export context utilities for convenience
export { RuntimeContextReact, useRuntimeContext, useHasRuntimeContext } from '../../../context/RuntimeContext';

export interface ShellAppProps {
  context: RuntimeContext;
}

/**
 * Error Boundary for debugging render errors
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ShellErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details to help debug
    console.error('=== TUI Render Error ===');
    console.error('Error:', error.message);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('========================');
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Show error in TUI
      return (
        <box style={{ flexDirection: 'column', padding: 2 }}>
          <text fg="#f85149">TUI Render Error</text>
          <box style={{ marginTop: 1 }}>
            <text fg="#c9d1d9">{this.state.error?.message || 'Unknown error'}</text>
          </box>
          <box style={{ marginTop: 1 }}>
            <text fg="#8b949e">Check console for component stack trace</text>
          </box>
          <box style={{ marginTop: 1 }}>
            <text fg="#8b949e">Press Ctrl+C to exit</text>
          </box>
        </box>
      );
    }

    return this.props.children;
  }
}

/**
 * Shell App component that wraps the TUI with runtime context
 */
export function ShellApp({ context }: ShellAppProps) {
  return (
    <ShellErrorBoundary>
      <RuntimeContextReact.Provider value={context}>
        <AppProviders>
          <App />
        </AppProviders>
      </RuntimeContextReact.Provider>
    </ShellErrorBoundary>
  );
}
