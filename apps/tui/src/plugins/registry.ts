/**
 * Plugin Registry
 *
 * Manages plugin registration, dependency resolution, and lifecycle.
 */

import type { Command } from 'commander';
import type { RuntimeContext } from '../cli/context';
import type {
  TUIPlugin,
  Hook,
  TUIViewDefinition,
  TUIWidgetDefinition,
  KeyboardShortcut,
} from './interface';

export class PluginRegistry {
  private plugins: Map<string, TUIPlugin> = new Map();
  private hooks: Map<string, Hook> = new Map();
  private initialized: Set<string> = new Set();
  private started: Set<string> = new Set();

  /**
   * Register a plugin
   */
  register(plugin: TUIPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with id "${plugin.id}" is already registered`);
    }
    this.plugins.set(plugin.id, plugin);

    // Register hooks
    if (plugin.hooks) {
      for (const hook of plugin.hooks) {
        if (this.hooks.has(hook.id)) {
          throw new Error(`Hook with id "${hook.id}" is already registered`);
        }
        this.hooks.set(hook.id, hook);
      }
    }
  }

  /**
   * Get a plugin by ID
   */
  get(id: string): TUIPlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Check if a plugin is registered
   */
  has(id: string): boolean {
    return this.plugins.has(id);
  }

  /**
   * Get all registered plugins
   */
  getAll(): TUIPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Resolve plugin initialization order based on dependencies
   */
  resolveOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected involving plugin "${id}"`);
      }

      const plugin = this.plugins.get(id);
      if (!plugin) {
        throw new Error(`Plugin "${id}" not found`);
      }

      visiting.add(id);

      // Visit dependencies first
      for (const dep of plugin.dependencies ?? []) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin "${id}" depends on unregistered plugin "${dep}"`);
        }
        visit(dep);
      }

      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    // Visit all plugins
    for (const id of this.plugins.keys()) {
      visit(id);
    }

    return order;
  }

  /**
   * Resolve hook execution order based on dependencies
   */
  resolveHookOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected involving hook "${id}"`);
      }

      const hook = this.hooks.get(id);
      if (!hook) {
        throw new Error(`Hook "${id}" not found`);
      }

      visiting.add(id);

      // Visit dependencies first
      for (const dep of hook.dependencies) {
        if (this.hooks.has(dep)) {
          visit(dep);
        }
      }

      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    // Visit all hooks
    for (const id of this.hooks.keys()) {
      visit(id);
    }

    return order;
  }

  /**
   * Initialize all hooks in dependency order
   */
  async initializeHooks(context: RuntimeContext): Promise<void> {
    const order = this.resolveHookOrder();

    for (const id of order) {
      const hook = this.hooks.get(id)!;
      await hook.init(context);
    }
  }

  /**
   * Cleanup all hooks in reverse order
   */
  async cleanupHooks(context: RuntimeContext): Promise<void> {
    const order = this.resolveHookOrder().reverse();

    for (const id of order) {
      const hook = this.hooks.get(id)!;
      if (hook.cleanup) {
        await hook.cleanup(context);
      }
    }
  }

  /**
   * Initialize all plugins in dependency order
   */
  async initializePlugins(context: RuntimeContext): Promise<void> {
    const order = this.resolveOrder();

    for (const id of order) {
      if (this.initialized.has(id)) continue;

      const plugin = this.plugins.get(id)!;
      if (plugin.init) {
        await plugin.init(context);
      }
      this.initialized.add(id);
    }
  }

  /**
   * Start all plugins in dependency order
   */
  async startPlugins(context: RuntimeContext): Promise<void> {
    const order = this.resolveOrder();

    for (const id of order) {
      if (this.started.has(id)) continue;

      const plugin = this.plugins.get(id)!;
      if (plugin.start) {
        await plugin.start(context);
      }
      this.started.add(id);
    }
  }

  /**
   * Stop all plugins in reverse dependency order
   */
  async stopPlugins(context: RuntimeContext): Promise<void> {
    const order = this.resolveOrder().reverse();

    for (const id of order) {
      if (!this.started.has(id)) continue;

      const plugin = this.plugins.get(id)!;
      if (plugin.stop) {
        await plugin.stop(context);
      }
      this.started.delete(id);
    }
  }

  /**
   * Register CLI commands from all plugins
   */
  async registerCommands(parent: Command, context: RuntimeContext): Promise<void> {
    const order = this.resolveOrder();

    for (const id of order) {
      const plugin = this.plugins.get(id)!;
      if (plugin.registerCommands) {
        await plugin.registerCommands(parent, context);
      }
    }
  }

  /**
   * Get all view definitions from all plugins
   */
  getAllViews(): TUIViewDefinition[] {
    const views: TUIViewDefinition[] = [];

    for (const plugin of this.plugins.values()) {
      if (plugin.getViews) {
        views.push(...plugin.getViews());
      }
    }

    // Sort by order
    return views.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  /**
   * Get all widget definitions from all plugins
   */
  getAllWidgets(): TUIWidgetDefinition[] {
    const widgets: TUIWidgetDefinition[] = [];

    for (const plugin of this.plugins.values()) {
      if (plugin.getWidgets) {
        widgets.push(...plugin.getWidgets());
      }
    }

    // Sort by order
    return widgets.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  /**
   * Get all keyboard shortcuts from all plugins
   */
  getAllKeyboardShortcuts(): KeyboardShortcut[] {
    const shortcuts: KeyboardShortcut[] = [];

    for (const plugin of this.plugins.values()) {
      if (plugin.getKeyboardShortcuts) {
        shortcuts.push(...plugin.getKeyboardShortcuts());
      }
    }

    return shortcuts;
  }
}
