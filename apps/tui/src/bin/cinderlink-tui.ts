#!/usr/bin/env bun
/**
 * Cinderlink TUI CLI Entry Point
 *
 * This is the main entry point for the Cinderlink TUI CLI.
 * It supports multiple commands:
 * - Default (no args): Launch TUI shell
 * - shell: Launch TUI shell explicitly
 * - config: Configuration management
 * - identity: Identity management
 *
 * Usage:
 *   cinderlink-tui                          # Launch TUI (demo mode)
 *   cinderlink-tui shell                    # Launch TUI shell
 *   cinderlink-tui config show              # Show configuration
 *   cinderlink-tui config set <key> <value> # Set configuration value
 *   cinderlink-tui identity show            # Show identity
 *   cinderlink-tui identity create          # Create new identity
 *   cinderlink-tui identity import <seed>   # Import from seed phrase
 *   cinderlink-tui --help                   # Show help
 *
 * Quick Start:
 *   1. Create an identity:
 *      cinderlink-tui identity create --save
 *
 *   2. (Optional) Set bootstrap nodes:
 *      cinderlink-tui config set network.bootstrapNodes '["multiaddr1", "multiaddr2"]'
 *
 *   3. Launch TUI:
 *      cinderlink-tui
 */

import { createCLIApp } from '../cli/app';
import { ConfigPlugin } from '../cli/plugins/config';
import { IdentityPlugin } from '../cli/plugins/identity';
import { ShellPlugin } from '../cli/plugins/shell';

async function main() {
  const app = createCLIApp({
    name: 'cinderlink-tui',
    version: '0.1.0',
    description: 'Cinderlink Terminal User Interface - A debug toolkit and node GUI',
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  });

  // Register plugins in dependency order
  app.registerPlugin(new ConfigPlugin());
  app.registerPlugin(new IdentityPlugin());
  app.registerPlugin(new ShellPlugin());

  // Run the CLI
  await app.run();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
