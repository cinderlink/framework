#!/usr/bin/env bun
/**
 * Cinderlink TUI Entry Point
 */

import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { App } from './App';
import { AppProviders } from './AppProviders';

let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null;
let isCleaningUp = false;

// Set up signal handlers FIRST, before anything else
const cleanup = () => {
  if (isCleaningUp) return;
  isCleaningUp = true;

  try {
    renderer?.stop();
    renderer?.destroy();
  } catch {
    // Ignore cleanup errors
  }

  process.exit(0);
};

// Register handlers immediately
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Also handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error.message);
  cleanup();
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  cleanup();
});

async function main() {
  try {
    // Create renderer with mouse support enabled
    // Enable exitOnCtrlC as backup
    renderer = await createCliRenderer({
      exitOnCtrlC: true,
      useMouse: true,
      enableMouseMovement: true,
    });

    // Start the renderer BEFORE creating root
    await renderer.start();

    // Create root and render with providers
    const root = createRoot(renderer);
    root.render(
      <AppProviders>
        <App />
      </AppProviders>
    );

  } catch (error) {
    console.error('Failed to start TUI:', error);
    cleanup();
  }
}

main();
