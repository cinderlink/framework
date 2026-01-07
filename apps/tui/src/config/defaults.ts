/**
 * Default Configuration Values
 */

import type { CinderlinkTUIConfig } from './schema';

export const DEFAULT_CONFIG: CinderlinkTUIConfig = {
  identity: {
    // No default identity - must be created or loaded
  },

  network: {
    bootstrapNodes: [],
    listenAddresses: [],
    autoConnect: true,
    connectTimeout: 10000,
    keepAliveInterval: 5000,
  },

  tui: {
    theme: 'dark',
    logLevel: 'info',
    timestampFormat: 'relative',
    defaultView: 'dashboard',
    autoScroll: true,
  },

  plugins: {
    enabled: [],
    disabled: [],
    config: {},
  },
};

/**
 * Config directory paths
 */
export const CONFIG_PATHS = {
  /** Global config directory */
  globalDir: () => {
    const home = process.env.HOME || process.env.USERPROFILE || '~';
    return `${home}/.cinderlink`;
  },

  /** Global config file */
  globalConfig: () => `${CONFIG_PATHS.globalDir()}/config.json`,

  /** Project config directory */
  projectDir: () => '.cinderlink',

  /** Project config file */
  projectConfig: () => `${CONFIG_PATHS.projectDir()}/config.json`,
};

/**
 * Environment variable prefix
 */
export const ENV_PREFIX = 'CINDERLINK_';
