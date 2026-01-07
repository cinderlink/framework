/**
 * Identity Plugin
 *
 * Provides CLI commands for identity management.
 */

import type { Command } from 'commander';
import { BaseTUIPlugin } from '../../../plugins/interface';
import type { RuntimeContext } from '../../context';
import { createIdentity } from '../../hooks/client';
import { loadConfig, saveConfig } from '../../../config/loader';

export class IdentityPlugin extends BaseTUIPlugin {
  id = 'identity';
  name = 'Identity';
  description = 'Identity management commands';
  dependencies = ['config'];

  async registerCommands(parent: Command, context: RuntimeContext): Promise<void> {
    const identity = parent
      .command('identity')
      .description('Manage Cinderlink identity');

    // Show current identity
    identity
      .command('show')
      .description('Show current identity configuration')
      .action(async () => {
        const config = context.config;
        const logger = context.logger;

        logger.info('Current Identity Configuration:');
        logger.info('================================');

        if (config.identity?.did) {
          logger.info(`DID: ${config.identity.did}`);
        } else {
          logger.info('DID: Not configured');
        }

        if (config.identity?.address) {
          logger.info(`Address: ${config.identity.address}`);
        } else {
          logger.info('Address: Not configured');
        }

        if (config.identity?.seedPhrase) {
          logger.info('Seed Phrase: [configured]');
        } else {
          logger.info('Seed Phrase: Not configured');
        }

        if (config.identity?.privateKey) {
          logger.info('Private Key: [configured]');
        } else {
          logger.info('Private Key: Not configured');
        }

        if (!config.identity?.seedPhrase && !config.identity?.privateKey) {
          logger.info('');
          logger.info('To set up identity, run:');
          logger.info('  cinderlink-tui identity create');
          logger.info('or');
          logger.info('  cinderlink-tui config set identity.seedPhrase "your-seed-phrase"');
        }
      });

    // Create new identity
    identity
      .command('create')
      .description('Create a new identity')
      .option('-s, --seed <phrase>', 'Use a specific seed phrase')
      .option('--save', 'Save identity to config file')
      .action(async (options) => {
        const logger = context.logger;

        logger.info('Creating new identity...');

        const result = await createIdentity(context, options.seed);

        if (result) {
          if (options.save) {
            try {
              const currentConfig = await loadConfig();
              currentConfig.identity = {
                ...currentConfig.identity,
                did: result.did,
                seedPhrase: options.seed || `cinderlink-tui-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              };
              await saveConfig(currentConfig);
              logger.info('Identity saved to config file');
            } catch (error) {
              logger.error('Failed to save identity to config', {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          } else {
            logger.info('');
            logger.info('To save this identity, add --save flag or run:');
            logger.info(`  cinderlink-tui config set identity.seedPhrase "${options.seed || '<your-seed-phrase>'}"`);
          }
        }
      });

    // Import from seed phrase
    identity
      .command('import <seedPhrase>')
      .description('Import identity from seed phrase')
      .action(async (seedPhrase: string) => {
        const logger = context.logger;

        logger.info('Importing identity from seed phrase...');

        const result = await createIdentity(context, seedPhrase);

        if (result) {
          try {
            const currentConfig = await loadConfig();
            currentConfig.identity = {
              ...currentConfig.identity,
              did: result.did,
              seedPhrase,
            };
            await saveConfig(currentConfig);
            logger.info('Identity imported and saved successfully');
          } catch (error) {
            logger.error('Failed to save identity to config', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      });
  }
}
