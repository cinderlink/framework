/**
 * Config Plugin
 *
 * Provides configuration management commands.
 */

import type { Command } from 'commander';
import { BaseTUIPlugin, type Hook } from '../../../plugins/interface';
import type { RuntimeContext } from '../../context';
import { loadConfig, saveConfig, CONFIG_PATHS, type CinderlinkTUIConfig } from '../../../config';

/**
 * Config initialization hook
 */
export const configHook: Hook = {
  id: 'config',
  name: 'Configuration',
  dependencies: [],
  init: () => {
    // Config is already loaded in app.ts, this hook just marks it as ready
  },
};

export class ConfigPlugin extends BaseTUIPlugin {
  id = 'config';
  name = 'Configuration';
  description = 'Configuration management commands';
  dependencies = [];
  hooks = [configHook];

  async registerCommands(parent: Command, context: RuntimeContext): Promise<void> {
    const configCmd = parent
      .command('config')
      .description('Manage configuration');

    // config show
    configCmd
      .command('show')
      .description('Show current configuration')
      .option('--json', 'Output as JSON')
      .action((options) => {
        const config = context.config;
        if (options.json) {
          console.log(JSON.stringify(config, null, 2));
        } else {
          this.printConfig(config);
        }
      });

    // config get <key>
    configCmd
      .command('get <key>')
      .description('Get a configuration value')
      .action((key: string) => {
        const config = context.config;
        const value = this.getNestedValue(config, key);
        if (value === undefined) {
          console.log(`Key "${key}" not found`);
          process.exit(1);
        } else {
          console.log(typeof value === 'object' ? JSON.stringify(value, null, 2) : value);
        }
      });

    // config set <key> <value>
    configCmd
      .command('set <key> <value>')
      .description('Set a configuration value')
      .option('--global', 'Save to global config', true)
      .option('--project', 'Save to project config')
      .action((key: string, value: string, options) => {
        // Load current config
        const configPath = options.project
          ? CONFIG_PATHS.projectConfig()
          : CONFIG_PATHS.globalConfig();

        const config = loadConfig({
          skipGlobal: options.project,
          skipProject: !options.project,
        });

        // Set the value
        this.setNestedValue(config, key, this.parseValue(value));

        // Save
        if (saveConfig(config, configPath)) {
          console.log(`Set ${key} = ${value}`);
        } else {
          console.error('Failed to save configuration');
          process.exit(1);
        }
      });

    // config reset
    configCmd
      .command('reset')
      .description('Reset configuration to defaults')
      .option('--global', 'Reset global config')
      .option('--project', 'Reset project config')
      .action((options) => {
        const { DEFAULT_CONFIG } = require('../../../config/defaults');

        if (options.global) {
          saveConfig(DEFAULT_CONFIG, CONFIG_PATHS.globalConfig());
          console.log('Global configuration reset to defaults');
        }
        if (options.project) {
          saveConfig(DEFAULT_CONFIG, CONFIG_PATHS.projectConfig());
          console.log('Project configuration reset to defaults');
        }
        if (!options.global && !options.project) {
          console.log('Specify --global or --project to reset');
        }
      });

    // config path
    configCmd
      .command('path')
      .description('Show configuration file paths')
      .action(() => {
        console.log('Global config:', CONFIG_PATHS.globalConfig());
        console.log('Project config:', CONFIG_PATHS.projectConfig());
      });
  }

  private printConfig(config: CinderlinkTUIConfig, indent = 0): void {
    const pad = '  '.repeat(indent);
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null) {
        console.log(`${pad}${key}:`);
        this.printConfig(value as CinderlinkTUIConfig, indent + 1);
      } else {
        console.log(`${pad}${key}: ${value}`);
      }
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  private parseValue(value: string): unknown {
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch {
      // Return as string
      return value;
    }
  }
}
