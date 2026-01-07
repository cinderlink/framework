/**
 * Configuration Schema for Cinderlink TUI
 *
 * Defines the structure of configuration that can be set via:
 * 1. ~/.cinderlink/config.json (global)
 * 2. ./.cinderlink/config.json (project)
 * 3. Environment variables (CINDERLINK_*)
 * 4. CLI flags
 */

export interface IdentityConfig {
  /** DID identifier (did:key:...) */
  did?: string;
  /** Ethereum address */
  address?: `0x${string}`;
  /** Path to key file */
  keyPath?: string;
  /** Address verification token */
  addressVerification?: string;
  /** Seed phrase for generating identity (used if no keyPath) */
  seedPhrase?: string;
  /** Private key for Ethereum wallet (hex string, 0x-prefixed) */
  privateKey?: `0x${string}`;
}

export interface NetworkConfig {
  /** Bootstrap node multiaddresses */
  bootstrapNodes?: string[];
  /** Listen addresses for P2P */
  listenAddresses?: string[];
  /** Auto-connect on startup */
  autoConnect?: boolean;
  /** Connection timeout in ms */
  connectTimeout?: number;
  /** Keepalive interval in ms */
  keepAliveInterval?: number;
}

export interface TUIConfig {
  /** Color theme */
  theme?: 'dark' | 'light';
  /** Minimum log level to display */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Timestamp format in logs */
  timestampFormat?: 'ISO' | 'relative' | 'local';
  /** Default view on startup */
  defaultView?: 'dashboard' | 'peers' | 'logs' | 'database' | 'settings';
  /** Auto-scroll logs */
  autoScroll?: boolean;
}

export interface PluginsConfig {
  /** Explicitly enabled plugins */
  enabled?: string[];
  /** Explicitly disabled plugins */
  disabled?: string[];
  /** Per-plugin configuration */
  config?: Record<string, Record<string, unknown>>;
}

export interface CinderlinkTUIConfig {
  /** Identity configuration */
  identity?: IdentityConfig;
  /** Network configuration */
  network?: NetworkConfig;
  /** TUI configuration */
  tui?: TUIConfig;
  /** Plugins configuration */
  plugins?: PluginsConfig;
}

/**
 * Deep merge two config objects
 */
export function mergeConfigs(
  base: CinderlinkTUIConfig,
  override: Partial<CinderlinkTUIConfig>
): CinderlinkTUIConfig {
  const result: CinderlinkTUIConfig = { ...base };

  if (override.identity) {
    result.identity = { ...base.identity, ...override.identity };
  }
  if (override.network) {
    result.network = { ...base.network, ...override.network };
  }
  if (override.tui) {
    result.tui = { ...base.tui, ...override.tui };
  }
  if (override.plugins) {
    result.plugins = {
      ...base.plugins,
      ...override.plugins,
      config: {
        ...base.plugins?.config,
        ...override.plugins?.config,
      },
    };
  }

  return result;
}

/**
 * Validate a config object
 */
export function validateConfig(config: unknown): config is CinderlinkTUIConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const c = config as Record<string, unknown>;

  // Validate identity if present
  if (c.identity !== undefined) {
    if (typeof c.identity !== 'object' || c.identity === null) {
      return false;
    }
    const identity = c.identity as Record<string, unknown>;
    if (identity.did !== undefined && typeof identity.did !== 'string') {
      return false;
    }
    if (identity.address !== undefined && typeof identity.address !== 'string') {
      return false;
    }
  }

  // Validate tui if present
  if (c.tui !== undefined) {
    if (typeof c.tui !== 'object' || c.tui === null) {
      return false;
    }
    const tui = c.tui as Record<string, unknown>;
    if (tui.theme !== undefined && !['dark', 'light'].includes(tui.theme as string)) {
      return false;
    }
    if (
      tui.logLevel !== undefined &&
      !['debug', 'info', 'warn', 'error'].includes(tui.logLevel as string)
    ) {
      return false;
    }
  }

  return true;
}
