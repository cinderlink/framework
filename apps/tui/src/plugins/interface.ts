/**
 * Plugin System Interfaces
 *
 * Defines the contract for TUI plugins that can extend:
 * - CLI commands
 * - TUI views
 * - TUI widgets
 * - Keyboard shortcuts
 */

import type { Command } from 'commander';
import type { ComponentType } from 'react';
import type { RuntimeContext } from '../cli/context';

/**
 * Hook that runs during initialization
 */
export interface Hook {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Hook IDs that must run before this one */
  dependencies: string[];
  /** Initialization function */
  init: (context: RuntimeContext) => Promise<void> | void;
  /** Cleanup function (optional) */
  cleanup?: (context: RuntimeContext) => Promise<void> | void;
}

/**
 * Props passed to view components
 */
export interface ViewProps {
  colors: Record<string, string>;
  context: RuntimeContext;
}

/**
 * Props passed to widget components
 */
export interface WidgetProps {
  colors: Record<string, string>;
  context: RuntimeContext;
}

/**
 * TUI View definition
 */
export interface TUIViewDefinition {
  /** Unique view identifier */
  id: string;
  /** Display name */
  name: string;
  /** Keyboard shortcut (e.g., '6') */
  shortcut?: string;
  /** View component */
  component: ComponentType<ViewProps>;
  /** Optional icon character */
  icon?: string;
  /** Order in navigation (lower = earlier) */
  order?: number;
}

/**
 * TUI Widget definition
 */
export interface TUIWidgetDefinition {
  /** Unique widget identifier */
  id: string;
  /** Display name */
  name: string;
  /** Widget component */
  component: ComponentType<WidgetProps>;
  /** Where to place the widget */
  placement: 'dashboard' | 'sidebar' | 'statusbar';
  /** Order within placement (lower = earlier) */
  order?: number;
}

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Key name (e.g., 'r', 'escape') */
  key: string;
  /** Modifier keys */
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
  /** Handler function */
  handler: (context: RuntimeContext) => void | Promise<void>;
  /** Description for help text */
  description: string;
  /** View IDs where this shortcut is active (empty = global) */
  activeInViews?: string[];
}

/**
 * TUI Plugin interface
 */
export interface TUIPlugin {
  /** Unique plugin identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Plugin IDs this depends on */
  dependencies?: string[];
  /** Hooks to register */
  hooks?: Hook[];

  /**
   * Initialize the plugin (called after dependencies are initialized)
   */
  init?(context: RuntimeContext): Promise<void>;

  /**
   * Start the plugin (called when TUI starts)
   */
  start?(context: RuntimeContext): Promise<void>;

  /**
   * Stop the plugin (called when TUI stops)
   */
  stop?(context: RuntimeContext): Promise<void>;

  /**
   * Register CLI commands
   */
  registerCommands?(parent: Command, context: RuntimeContext): Promise<void>;

  /**
   * Get view definitions
   */
  getViews?(): TUIViewDefinition[];

  /**
   * Get widget definitions
   */
  getWidgets?(): TUIWidgetDefinition[];

  /**
   * Get keyboard shortcuts
   */
  getKeyboardShortcuts?(): KeyboardShortcut[];
}

/**
 * Base class for plugins
 */
export abstract class BaseTUIPlugin implements TUIPlugin {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  dependencies?: string[];
  hooks?: Hook[];

  async init(_context: RuntimeContext): Promise<void> {
    // Override in subclass
  }

  async start(_context: RuntimeContext): Promise<void> {
    // Override in subclass
  }

  async stop(_context: RuntimeContext): Promise<void> {
    // Override in subclass
  }

  async registerCommands(_parent: Command, _context: RuntimeContext): Promise<void> {
    // Override in subclass
  }

  getViews(): TUIViewDefinition[] {
    return [];
  }

  getWidgets(): TUIWidgetDefinition[] {
    return [];
  }

  getKeyboardShortcuts(): KeyboardShortcut[] {
    return [];
  }
}
