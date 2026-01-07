/**
 * Cinderlink TUI CLI Application
 *
 * Main application class that orchestrates:
 * - Command parsing (Commander.js)
 * - Plugin registration and lifecycle
 * - Hook execution
 * - Context management
 */

import { Command } from 'commander';
import {
  runtimeContext,
  createDefaultLogger,
  detectCLIInvocation,
  type RuntimeContext,
} from './context';
import { loadConfig, initializeGlobalConfig, type LoadConfigOptions } from '../config';
import { PluginRegistry } from '../plugins/registry';
import type { TUIPlugin } from '../plugins/interface';

export interface CLIAppOptions {
  /** Application name */
  name?: string;
  /** Application version */
  version?: string;
  /** Description */
  description?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Config loading options */
  configOptions?: LoadConfigOptions;
}

export class CinderlinkTUIApp {
  private program: Command;
  private plugins: PluginRegistry;
  private options: CLIAppOptions;
  private keepAliveFlag = false;
  private verbose: boolean;

  constructor(options: CLIAppOptions = {}) {
    this.options = options;
    this.verbose = options.verbose ?? false;
    this.plugins = new PluginRegistry();

    // Create Commander program
    this.program = new Command()
      .name(options.name ?? 'cinderlink-tui')
      .version(options.version ?? '0.1.0')
      .description(options.description ?? 'Cinderlink Terminal User Interface');

    // Add global options
    this.program
      .option('-v, --verbose', 'Enable verbose output')
      .option('-c, --config <path>', 'Path to config file')
      .option('--no-global-config', 'Skip loading global config')
      .option('--no-project-config', 'Skip loading project config');
  }

  /**
   * Register a plugin
   */
  registerPlugin(plugin: TUIPlugin): this {
    this.plugins.register(plugin);
    return this;
  }

  /**
   * Get the Commander program for adding commands
   */
  getProgram(): Command {
    return this.program;
  }

  /**
   * Get the plugin registry
   */
  getPlugins(): PluginRegistry {
    return this.plugins;
  }

  /**
   * Initialize the application context
   */
  private async initializeContext(): Promise<void> {
    // Initialize global config directory
    initializeGlobalConfig();

    // Load configuration
    const config = loadConfig(this.options.configOptions);
    runtimeContext.set('config', config);

    // Create logger
    const logger = createDefaultLogger(this.verbose);
    runtimeContext.set('logger', logger);

    // Set CLI invocation info
    const cli = detectCLIInvocation();
    runtimeContext.set('cli', cli);

    // Set plugin registry
    runtimeContext.set('plugins', this.plugins);

    // Set app lifecycle
    runtimeContext.set('app', {
      keepAlive: () => {
        this.keepAliveFlag = true;
      },
      shouldKeepAlive: () => this.keepAliveFlag,
      exit: (code = 0) => {
        process.exit(code);
      },
    });
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    process.on('unhandledRejection', (error: Error) => {
      const logger = runtimeContext.get('logger');
      if (logger) {
        logger.error('Unhandled rejection', { error: error.message, stack: error.stack });
      } else {
        console.error('[UNHANDLED REJECTION]', error);
      }
      process.exit(1);
    });

    process.on('uncaughtException', (error: Error) => {
      const logger = runtimeContext.get('logger');
      if (logger) {
        logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      } else {
        console.error('[UNCAUGHT EXCEPTION]', error);
      }
      process.exit(1);
    });
  }

  /**
   * Run the CLI application
   */
  async run(argv?: string[]): Promise<void> {
    this.setupErrorHandlers();

    // Initialize context first
    await this.initializeContext();

    // Get context for plugins
    const context = runtimeContext.getAll() as RuntimeContext;

    // Initialize hooks
    await this.plugins.initializeHooks(context);

    // Initialize plugins
    await this.plugins.initializePlugins(context);

    // Register commands from plugins
    await this.plugins.registerCommands(this.program, context);

    // Parse arguments and execute
    await this.program.parseAsync(argv ?? process.argv);

    // If no command was matched and no keepAlive, show help
    if (!this.keepAliveFlag && !process.argv.slice(2).length) {
      this.program.help();
    }

    // Exit unless keepAlive was called
    if (!this.keepAliveFlag) {
      // Cleanup
      await this.plugins.stopPlugins(context);
      await this.plugins.cleanupHooks(context);
      process.exit(0);
    }

    // Setup cleanup on exit signals
    const cleanup = async () => {
      await this.plugins.stopPlugins(context);
      await this.plugins.cleanupHooks(context);
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }
}

/**
 * Create a new CLI app instance
 */
export function createCLIApp(options?: CLIAppOptions): CinderlinkTUIApp {
  return new CinderlinkTUIApp(options);
}
