/**
 * Configuration Loader
 *
 * Loads and merges configuration from multiple sources:
 * 1. Default config
 * 2. Global config (~/.cinderlink/config.json)
 * 3. Project config (./.cinderlink/config.json)
 * 4. Environment variables (CINDERLINK_*)
 * 5. CLI flags (passed as options)
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { type CinderlinkTUIConfig, mergeConfigs, validateConfig } from './schema';
import { DEFAULT_CONFIG, CONFIG_PATHS, ENV_PREFIX } from './defaults';

export interface LoadConfigOptions {
  /** Skip loading global config */
  skipGlobal?: boolean;
  /** Skip loading project config */
  skipProject?: boolean;
  /** Skip loading environment variables */
  skipEnv?: boolean;
  /** CLI flag overrides */
  cliOverrides?: Partial<CinderlinkTUIConfig>;
}

/**
 * Load configuration from all sources
 */
export function loadConfig(options: LoadConfigOptions = {}): CinderlinkTUIConfig {
  let config = { ...DEFAULT_CONFIG };

  // Load global config
  if (!options.skipGlobal) {
    const globalConfig = loadConfigFile(CONFIG_PATHS.globalConfig());
    if (globalConfig) {
      config = mergeConfigs(config, globalConfig);
    }
  }

  // Load project config
  if (!options.skipProject) {
    const projectConfig = loadConfigFile(CONFIG_PATHS.projectConfig());
    if (projectConfig) {
      config = mergeConfigs(config, projectConfig);
    }
  }

  // Load environment variables
  if (!options.skipEnv) {
    const envConfig = loadEnvConfig();
    config = mergeConfigs(config, envConfig);
  }

  // Apply CLI overrides
  if (options.cliOverrides) {
    config = mergeConfigs(config, options.cliOverrides);
  }

  return config;
}

/**
 * Load a config file from disk
 */
export function loadConfigFile(path: string): CinderlinkTUIConfig | null {
  try {
    if (!existsSync(path)) {
      return null;
    }

    const content = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(content);

    if (!validateConfig(parsed)) {
      console.warn(`Invalid config file at ${path}, ignoring`);
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn(`Failed to load config from ${path}:`, error);
    return null;
  }
}

/**
 * Load configuration from environment variables
 */
export function loadEnvConfig(): Partial<CinderlinkTUIConfig> {
  const config: Partial<CinderlinkTUIConfig> = {};

  // Identity
  if (process.env[`${ENV_PREFIX}DID`]) {
    config.identity = config.identity || {};
    config.identity.did = process.env[`${ENV_PREFIX}DID`];
  }
  if (process.env[`${ENV_PREFIX}ADDRESS`]) {
    config.identity = config.identity || {};
    config.identity.address = process.env[`${ENV_PREFIX}ADDRESS`] as `0x${string}`;
  }
  if (process.env[`${ENV_PREFIX}KEY_PATH`]) {
    config.identity = config.identity || {};
    config.identity.keyPath = process.env[`${ENV_PREFIX}KEY_PATH`];
  }

  // Network
  if (process.env[`${ENV_PREFIX}BOOTSTRAP_NODES`]) {
    config.network = config.network || {};
    config.network.bootstrapNodes = process.env[`${ENV_PREFIX}BOOTSTRAP_NODES`]!.split(',');
  }
  if (process.env[`${ENV_PREFIX}AUTO_CONNECT`]) {
    config.network = config.network || {};
    config.network.autoConnect = process.env[`${ENV_PREFIX}AUTO_CONNECT`] === 'true';
  }

  // TUI
  if (process.env[`${ENV_PREFIX}THEME`]) {
    const theme = process.env[`${ENV_PREFIX}THEME`];
    if (theme === 'dark' || theme === 'light') {
      config.tui = config.tui || {};
      config.tui.theme = theme;
    }
  }
  if (process.env[`${ENV_PREFIX}LOG_LEVEL`]) {
    const level = process.env[`${ENV_PREFIX}LOG_LEVEL`];
    if (['debug', 'info', 'warn', 'error'].includes(level!)) {
      config.tui = config.tui || {};
      config.tui.logLevel = level as 'debug' | 'info' | 'warn' | 'error';
    }
  }

  return config;
}

/**
 * Save configuration to a file
 */
export function saveConfig(
  config: CinderlinkTUIConfig,
  path: string,
  createDir = true
): boolean {
  try {
    if (createDir) {
      const dir = path.substring(0, path.lastIndexOf('/'));
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    writeFileSync(path, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error(`Failed to save config to ${path}:`, error);
    return false;
  }
}

/**
 * Initialize global config directory and file if they don't exist
 */
export function initializeGlobalConfig(): void {
  const dir = CONFIG_PATHS.globalDir();
  const file = CONFIG_PATHS.globalConfig();

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(file)) {
    saveConfig(DEFAULT_CONFIG, file, false);
  }
}
