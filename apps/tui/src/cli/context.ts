/**
 * Runtime Context Manager
 *
 * Manages the shared context that gets populated by hooks and used by plugins.
 * Similar to vibes CLI pattern but adapted for Cinderlink TUI.
 */

import type { CinderlinkClientInterface } from '@cinderlink/core-types';
import type { CinderlinkTUIConfig } from '../config/schema';
import type { PluginRegistry } from '../plugins/registry';

export interface AppLifecycle {
  keepAlive: () => void;
  shouldKeepAlive: () => boolean;
  exit: (code?: number) => void;
}

export interface CLIInvocation {
  runtime: 'bun' | 'node' | 'binary';
  scriptPath?: string;
  command: string;
  args: string[];
  cwd: string;
}

export interface LoggerInterface {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export interface RuntimeContext {
  app: AppLifecycle;
  cli: CLIInvocation;
  config: CinderlinkTUIConfig;
  client?: CinderlinkClientInterface;
  logger: LoggerInterface;
  plugins: PluginRegistry;
}

type RuntimeContextKey = keyof RuntimeContext;

class RuntimeContextManager {
  private context: Partial<RuntimeContext> = {};

  set<K extends RuntimeContextKey>(key: K, value: RuntimeContext[K]): void {
    this.context[key] = value;
  }

  setByKey(key: string, value: unknown): void {
    (this.context as Record<string, unknown>)[key] = value;
  }

  get<K extends RuntimeContextKey>(key: K): RuntimeContext[K] | undefined {
    return this.context[key] as RuntimeContext[K] | undefined;
  }

  getAll(): Partial<RuntimeContext> {
    return { ...this.context };
  }

  has(key: string): boolean {
    return key in this.context;
  }

  getRequired<K extends RuntimeContextKey>(key: K): RuntimeContext[K] {
    const value = this.context[key];
    if (value === undefined) {
      throw new Error(`Required context key "${key}" is not set`);
    }
    return value as RuntimeContext[K];
  }

  clear(): void {
    this.context = {};
  }
}

export const runtimeContext = new RuntimeContextManager();

/**
 * Create a default logger implementation
 */
export function createDefaultLogger(verbose = false): LoggerInterface {
  return {
    debug(message: string, data?: Record<string, unknown>) {
      if (verbose) {
        console.log(`[DEBUG] ${message}`, data ?? '');
      }
    },
    info(message: string, data?: Record<string, unknown>) {
      console.log(`[INFO] ${message}`, data ?? '');
    },
    warn(message: string, data?: Record<string, unknown>) {
      console.warn(`[WARN] ${message}`, data ?? '');
    },
    error(message: string, data?: Record<string, unknown>) {
      console.error(`[ERROR] ${message}`, data ?? '');
    },
  };
}

/**
 * Detect how the CLI was invoked
 */
export function detectCLIInvocation(): CLIInvocation {
  const args = process.argv;
  const isBun = typeof Bun !== 'undefined';

  // Check if running as compiled binary
  const isBinary = args[0] && !args[0].includes('node') && !args[0].includes('bun');

  let runtime: CLIInvocation['runtime'];
  if (isBinary) {
    runtime = 'binary';
  } else if (isBun) {
    runtime = 'bun';
  } else {
    runtime = 'node';
  }

  return {
    runtime,
    scriptPath: isBinary ? undefined : args[1],
    command: args[2] ?? '',
    args: args.slice(3),
    cwd: process.cwd(),
  };
}
