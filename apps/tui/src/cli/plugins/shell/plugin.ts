/**
 * Shell Plugin
 *
 * Provides the TUI shell interface as a CLI command.
 * This is the main interactive mode for Cinderlink TUI.
 */

import type { Command } from 'commander';
import { BaseTUIPlugin } from '../../../plugins/interface';
import type { RuntimeContext } from '../../context';
import { clientHook } from '../../hooks/client';

export class ShellPlugin extends BaseTUIPlugin {
  id = 'shell';
  name = 'Shell';
  description = 'Interactive TUI shell interface';
  dependencies = ['config'];
  hooks = [clientHook];

  async registerCommands(parent: Command, context: RuntimeContext): Promise<void> {
    // Add 'shell' command
    parent
      .command('shell')
      .description('Launch the interactive TUI shell')
      .option('--view <view>', 'Start with a specific view', 'dashboard')
      .action(async (options) => {
        context.app.keepAlive();
        await this.launchShell(context, options.view);
      });

    // Make shell the default command when no args provided
    parent.action(async () => {
      context.app.keepAlive();
      await this.launchShell(context, context.config.tui?.defaultView ?? 'dashboard');
    });
  }

  private async launchShell(context: RuntimeContext, _defaultView: string): Promise<void> {
    // Dynamic import to avoid loading TUI dependencies for non-shell commands
    const { createCliRenderer } = await import('@opentui/core');
    const { createRoot } = await import('@opentui/react');
    const { ShellApp } = await import('./ShellApp');
    const React = await import('react');

    let isCleaningUp = false;
    let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null;

    // Handle cleanup with proper terminal restoration
    // IMPORTANT: Define cleanup BEFORE any async operations that could throw
    const cleanup = () => {
      if (isCleaningUp) return;
      isCleaningUp = true;

      try {
        // Stop renderer first (disables mouse, restores terminal)
        renderer?.stop();
        // Then destroy to clean up resources
        renderer?.destroy();
      } catch {
        // Ignore cleanup errors
      }

      // Remove all handlers
      process.off('SIGINT', cleanup);
      process.off('SIGTERM', cleanup);
      process.off('uncaughtException', handleError);
      process.off('unhandledRejection', handleError);

      process.exit(0);
    };

    // Handle errors - log and cleanup
    const handleError = (error: unknown) => {
      console.error('TUI Error:', error instanceof Error ? error.message : String(error));
      cleanup();
    };

    // Register signal and error handlers FIRST, before any operations that could fail
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', handleError);
    process.on('unhandledRejection', handleError);

    try {
      renderer = await createCliRenderer({
        exitOnCtrlC: true, // Enable as backup
        useMouse: true,
        enableMouseMovement: true,
      });

      await renderer.start();

      const root = createRoot(renderer);
      root.render(React.createElement(ShellApp, { context }));
    } catch (error) {
      console.error('Failed to start TUI:', error instanceof Error ? error.message : String(error));
      cleanup();
    }
  }
}
