/**
 * Client Initialization Hook
 *
 * Initializes the Cinderlink client based on configuration.
 * Creates identity, Helia node, and connects to the network.
 */

import type { Hook } from '../../plugins/interface';
import type { RuntimeContext } from '../context';
import { runtimeContext } from '../context';

export const clientHook: Hook = {
  id: 'client',
  name: 'Cinderlink Client',
  dependencies: ['config'],

  async init(context: RuntimeContext): Promise<void> {
    const config = context.config;
    const logger = context.logger;

    // Check if we have enough config to create a client
    const hasIdentity = config.identity?.seedPhrase || config.identity?.privateKey;

    if (!hasIdentity) {
      logger.info('No identity configured, running in demo mode');
      logger.info('To create a real node, set identity.seedPhrase in config');
      logger.info('  Example: cinderlink-tui config set identity.seedPhrase "my-seed-phrase"');
      return;
    }

    try {
      logger.info('Initializing Cinderlink client...');

      // Dynamic imports to avoid loading heavy dependencies for non-shell commands
      const { createSeed, createDID } = await import('@cinderlink/identifiers');
      const { createClient } = await import('@cinderlink/client');

      // Create DID from seed phrase
      const seedPhrase = config.identity.seedPhrase || `tui-${Date.now()}`;
      logger.debug('Creating DID from seed phrase...');
      const seed = await createSeed(seedPhrase);
      const did = await createDID(seed);
      logger.info(`DID created: ${did.id}`);

      // Handle Ethereum identity
      let address: `0x${string}`;
      let addressVerification: string;

      if (config.identity.privateKey) {
        // Use provided private key
        const { privateKeyToAccount } = await import('viem/accounts');
        const { createWalletClient, http } = await import('viem');
        const { mainnet } = await import('viem/chains');
        const { signAddressVerification } = await import('@cinderlink/identifiers');

        const account = privateKeyToAccount(config.identity.privateKey);
        address = account.address;

        const walletClient = createWalletClient({
          account,
          chain: mainnet,
          transport: http(),
        });

        logger.debug('Signing address verification...');
        addressVerification = await signAddressVerification(
          'cinderlink-tui',
          did.id,
          account,
          walletClient
        );
        logger.info(`Using Ethereum address: ${address}`);
      } else {
        // Generate a deterministic address for demo purposes
        // In production, user should provide a private key
        logger.warn('No privateKey configured, generating demo address');
        const seedHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(seedPhrase)
        );
        const hashHex = Array.from(new Uint8Array(seedHash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        address = `0x${hashHex.slice(0, 40)}` as `0x${string}`;
        addressVerification = 'demo-verification';
        logger.info(`Generated demo address: ${address}`);
      }

      // Prepare Helia options
      const heliaOptions = {
        testMode: process.env.NODE_ENV === 'test',
      };

      // Create the client
      logger.info('Creating Cinderlink client...');
      const client = await createClient({
        did,
        address,
        addressVerification,
        role: 'peer',
        nodes: config.network?.bootstrapNodes || [],
        options: heliaOptions,
        logger: {
          debug: (module: string, msg: string, data?: Record<string, unknown>) =>
            logger.debug(`[${module}] ${msg}`, data),
          info: (module: string, msg: string, data?: Record<string, unknown>) =>
            logger.info(`[${module}] ${msg}`, data),
          warn: (module: string, msg: string, data?: Record<string, unknown>) =>
            logger.warn(`[${module}] ${msg}`, data),
          error: (module: string, msg: string, data?: Record<string, unknown>) =>
            logger.error(`[${module}] ${msg}`, data),
        },
      });

      // Store in context
      runtimeContext.set('client', client);
      logger.info('Cinderlink client initialized successfully');

      // Auto-connect if configured
      if (config.network?.autoConnect && config.network?.bootstrapNodes?.length) {
        logger.info('Auto-connecting to bootstrap nodes...');
        try {
          await client.start(config.network.bootstrapNodes);
          logger.info('Connected to network');
        } catch (connectError) {
          logger.warn('Failed to auto-connect, client available in offline mode', {
            error: connectError instanceof Error ? connectError.message : String(connectError),
          });
        }
      }

    } catch (error) {
      logger.error('Failed to initialize Cinderlink client', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  },

  async cleanup(context: RuntimeContext): Promise<void> {
    const client = context.client;
    if (client) {
      context.logger.info('Stopping Cinderlink client...');
      try {
        await client.stop();
        context.logger.info('Cinderlink client stopped');
      } catch (error) {
        context.logger.error('Error stopping client', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  },
};

/**
 * Connect the client to bootstrap nodes
 */
export async function connectClient(context: RuntimeContext): Promise<boolean> {
  const client = context.client;
  const config = context.config;
  const logger = context.logger;

  if (!client) {
    logger.warn('No client available to connect');
    return false;
  }

  const bootstrapNodes = config.network?.bootstrapNodes || [];
  if (bootstrapNodes.length === 0) {
    logger.warn('No bootstrap nodes configured');
    return false;
  }

  try {
    logger.info('Connecting to network...');
    await client.start(bootstrapNodes);
    logger.info('Connected to network');
    return true;
  } catch (error) {
    logger.error('Failed to connect to network', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Disconnect the client from the network
 */
export async function disconnectClient(context: RuntimeContext): Promise<void> {
  const client = context.client;
  const logger = context.logger;

  if (!client) {
    return;
  }

  try {
    logger.info('Disconnecting from network...');
    await client.stop();
    logger.info('Disconnected from network');
  } catch (error) {
    logger.error('Failed to disconnect from network', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Create a new identity and save to config
 */
export async function createIdentity(
  context: RuntimeContext,
  seedPhrase?: string
): Promise<{ did: string; address: string } | null> {
  const logger = context.logger;

  try {
    const { createSeed, createDID } = await import('@cinderlink/identifiers');

    const phrase = seedPhrase || `cinderlink-tui-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const seed = await createSeed(phrase);
    const did = await createDID(seed);

    // Generate a demo address from seed
    const seedHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(phrase)
    );
    const hashHex = Array.from(new Uint8Array(seedHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const address = `0x${hashHex.slice(0, 40)}`;

    logger.info(`Created new identity: ${did.id}`);
    logger.info(`Address: ${address}`);
    logger.info(`Seed phrase: ${phrase}`);
    logger.warn('Save the seed phrase securely! You will need it to recover this identity.');

    return { did: did.id, address };
  } catch (error) {
    logger.error('Failed to create identity', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
