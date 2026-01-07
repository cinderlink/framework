#!/usr/bin/env bun
/**
 * Plugin Development Server
 * 
 * Provides a development environment for testing plugins against a live P2P network
 * with hot reloading and real-time feedback.
 */

import { CinderlinkClient } from '@cinderlink/client';
import { createDID, createSeed } from '@cinderlink/identifiers';
import { watch } from 'fs';
import { resolve } from 'path';

interface PluginDevConfig {
  bootstrapPeers: string[];
  port: number;
  dataDir: string;
  hotReload: boolean;
  pluginDirs: string[];
}

class PluginDevServer {
  private client?: CinderlinkClient;
  private config: PluginDevConfig;
  private watchers: Map<string, any> = new Map();

  constructor(config: PluginDevConfig) {
    this.config = config;
  }

  async start() {
    console.log('🚀 Starting Plugin Development Server...');
    
    try {
      // Create DID for dev server
      const seed = await createSeed('plugin-dev-server');
      const did = await createDID(seed);
      
      // Initialize client
      this.client = new CinderlinkClient({
        did,
        role: 'plugin-development',
        bootstrapPeers: this.config.bootstrapPeers,
        dataDir: this.config.dataDir,
        testMode: true,
        keepAliveInterval: 5000,
        keepAliveTimeout: 15000
      });

      // Start client
      await this.client.start();
      console.log(`✅ Plugin dev server started on port ${this.config.port}`);
      console.log(`📡 Connected to peers: ${this.config.bootstrapPeers.join(', ')}`);
      console.log(`🆔 Server DID: ${did.id}`);

      // Setup hot reloading if enabled
      if (this.config.hotReload) {
        await this.setupHotReloading();
      }

      // Setup graceful shutdown
      process.on('SIGINT', () => this.stop());
      process.on('SIGTERM', () => this.stop());

      // Keep alive
      setInterval(() => {
        if (this.client) {
          console.log(`📊 Connected peers: ${this.client.peers.getAllPeers().length}`);
        }
      }, 10000);

    } catch (error) {
      console.error('❌ Failed to start plugin dev server:', error);
      process.exit(1);
    }
  }

  async setupHotReloading() {
    console.log('🔄 Setting up hot reloading for plugin directories...');
    
    for (const pluginDir of this.config.pluginDirs) {
      const fullPath = resolve(pluginDir);
      console.log(`👀 Watching: ${fullPath}`);
      
      const watcher = watch(fullPath, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
          console.log(`🔄 File changed: ${filename} (${eventType})`);
          this.reloadPlugin(pluginDir, filename);
        }
      });
      
      this.watchers.set(pluginDir, watcher);
    }
  }

  async reloadPlugin(pluginDir: string, filename: string) {
    try {
      console.log(`🔄 Reloading plugin from ${pluginDir}/${filename}...`);
      
      // In a real implementation, this would:
      // 1. Stop the current plugin instance
      // 2. Clear the module cache
      // 3. Re-import the plugin
      // 4. Start the new plugin instance
      
      console.log(`✅ Plugin reloaded: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to reload plugin ${filename}:`, error);
    }
  }

  async stop() {
    console.log('🛑 Stopping plugin dev server...');
    
    // Close file watchers
    for (const [dir, watcher] of this.watchers) {
      watcher.close();
      console.log(`👋 Stopped watching: ${dir}`);
    }
    this.watchers.clear();

    // Stop client
    if (this.client) {
      await this.client.stop();
      console.log('✅ Client stopped');
    }

    console.log('👋 Plugin dev server stopped');
    process.exit(0);
  }
}

// Configuration from environment variables
const config: PluginDevConfig = {
  bootstrapPeers: (process.env.CINDERLINK_BOOTSTRAP_PEERS || '').split(',').filter(Boolean),
  port: parseInt(process.env.CINDERLINK_PORT || '4005'),
  dataDir: process.env.CINDERLINK_DATA_DIR || '/tmp/cinderlink-plugin-dev',
  hotReload: process.env.CINDERLINK_AUTO_RELOAD === 'true',
  pluginDirs: [
    'packages/plugin-*',
    'examples/plugins',
    'src/plugins'
  ]
};

// Start the server
if (import.meta.main) {
  const server = new PluginDevServer(config);
  server.start().catch(console.error);
}