#!/usr/bin/env bun
/**
 * Network Information and Debugging Tool
 * 
 * Provides real-time information about the P2P network state,
 * peer connections, and network health for debugging purposes.
 */

import { CinderlinkClient } from '@cinderlink/client';
import { createDID, createSeed } from '@cinderlink/identifiers';

interface NetworkStats {
  nodeId: string;
  role: string;
  connectedPeers: number;
  subscriptions: string[];
  networkLatency: Map<string, number>;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
}

class NetworkMonitor {
  private client?: CinderlinkClient;
  private stats: NetworkStats;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.stats = {
      nodeId: '',
      role: process.env.CINDERLINK_ROLE || 'unknown',
      connectedPeers: 0,
      subscriptions: [],
      networkLatency: new Map(),
      memoryUsage: process.memoryUsage(),
      uptime: 0
    };
  }

  async start() {
    console.log('🔍 Network Monitor Starting...\n');
    
    try {
      // Initialize monitoring client
      const seed = await createSeed('network-monitor');
      const did = await createDID(seed);
      
      this.stats.nodeId = did.id;
      
      // Print initial system info
      this.printSystemInfo();
      
      // If we're in a container with an existing client, try to connect
      const bootstrapPeers = (process.env.CINDERLINK_BOOTSTRAP_PEERS || '').split(',').filter(Boolean);
      
      if (bootstrapPeers.length > 0) {
        await this.connectToNetwork(did, bootstrapPeers);
      }
      
      // Start monitoring loop
      this.startMonitoringLoop();
      
    } catch (error) {
      console.error('❌ Failed to start network monitor:', error);
      process.exit(1);
    }
  }

  private async connectToNetwork(did: any, bootstrapPeers: string[]) {
    try {
      console.log('🌐 Connecting to P2P network...');
      
      this.client = new CinderlinkClient({
        did,
        role: 'monitor',
        bootstrapPeers,
        dataDir: '/tmp/network-monitor',
        testMode: true
      });

      await this.client.start();
      console.log('✅ Connected to P2P network\n');
      
    } catch (error) {
      console.warn('⚠️ Could not connect to P2P network (monitoring system info only):', error);
    }
  }

  private printSystemInfo() {
    const info = {
      'Node ID': this.stats.nodeId.slice(-12) + '...',
      'Role': this.stats.role,
      'Node Version': process.version,
      'Platform': `${process.platform} ${process.arch}`,
      'Container': process.env.HOSTNAME || 'unknown',
      'Working Dir': process.cwd()
    };

    console.log('📊 System Information:');
    console.log('─'.repeat(50));
    Object.entries(info).forEach(([key, value]) => {
      console.log(`${key.padEnd(15)}: ${value}`);
    });
    console.log('─'.repeat(50));
    console.log();
  }

  private startMonitoringLoop() {
    console.log('📡 Starting network monitoring (Ctrl+C to exit)...\n');
    
    // Update stats every 5 seconds
    const interval = setInterval(() => {
      this.updateStats();
      this.printNetworkStats();
    }, 5000);

    // Cleanup on exit
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping network monitor...');
      clearInterval(interval);
      if (this.client) {
        this.client.stop().then(() => process.exit(0));
      } else {
        process.exit(0);
      }
    });

    // Initial stats
    this.updateStats();
    this.printNetworkStats();
  }

  private updateStats() {
    this.stats.uptime = Date.now() - this.startTime;
    this.stats.memoryUsage = process.memoryUsage();
    
    if (this.client) {
      this.stats.connectedPeers = this.client.peers.getAllPeers().length;
      this.stats.subscriptions = this.client.subscriptions || [];
      
      // Test latency to connected peers
      this.measurePeerLatency();
    }
  }

  private async measurePeerLatency() {
    if (!this.client) return;
    
    const peers = this.client.peers.getAllPeers();
    for (const peer of peers.slice(0, 3)) { // Test first 3 peers only
      try {
        const start = Date.now();
        
        // Send a ping if client supports it
        if (typeof (this.client as any).ping === 'function') {
          await (this.client as any).ping(peer.peerId.toString());
          const latency = Date.now() - start;
          this.stats.networkLatency.set(peer.peerId.toString(), latency);
        }
      } catch (error) {
        // Ignore ping errors for monitoring
      }
    }
  }

  private printNetworkStats() {
    const { uptime, memoryUsage, connectedPeers, subscriptions, networkLatency } = this.stats;
    
    // Clear previous output (for updating display)
    if (process.stdout.isTTY) {
      process.stdout.write('\x1B[2J\x1B[0f'); // Clear screen and move cursor to top
    }
    
    console.log(`🔍 Network Monitor - ${new Date().toLocaleTimeString()}`);
    console.log('─'.repeat(60));
    
    // Uptime
    const uptimeSeconds = Math.floor(uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    console.log(`⏱️  Uptime: ${uptimeMinutes}m ${uptimeSeconds % 60}s`);
    
    // Memory usage
    const memMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };
    console.log(`💾 Memory: ${memMB.heapUsed}/${memMB.heapTotal}MB heap, ${memMB.rss}MB RSS`);
    
    // Network status
    if (this.client) {
      console.log(`🌐 P2P Status: Connected`);
      console.log(`👥 Connected Peers: ${connectedPeers}`);
      console.log(`📡 Subscriptions: ${subscriptions.length}`);
      
      // Peer details
      if (connectedPeers > 0) {
        console.log('\n📋 Peer Details:');
        const peers = this.client.peers.getAllPeers().slice(0, 5); // Show first 5
        peers.forEach((peer, index) => {
          const peerId = peer.peerId.toString().slice(-8);
          const did = peer.did ? peer.did.slice(-8) + '...' : 'unknown';
          const latency = networkLatency.get(peer.peerId.toString());
          const latencyStr = latency ? `${latency}ms` : 'n/a';
          console.log(`  ${index + 1}. ${peerId}... (${did}) - ${latencyStr}`);
        });
        
        if (this.client.peers.getAllPeers().length > 5) {
          console.log(`  ... and ${this.client.peers.getAllPeers().length - 5} more`);
        }
      }
      
      // Subscriptions
      if (subscriptions.length > 0) {
        console.log('\n📡 Active Subscriptions:');
        subscriptions.slice(0, 5).forEach((sub, index) => {
          console.log(`  ${index + 1}. ${sub}`);
        });
        if (subscriptions.length > 5) {
          console.log(`  ... and ${subscriptions.length - 5} more`);
        }
      }
      
    } else {
      console.log(`🌐 P2P Status: Not connected (monitoring local only)`);
    }
    
    console.log('\n─'.repeat(60));
    console.log('Press Ctrl+C to exit');
  }
}

// Main execution
if (import.meta.main) {
  const monitor = new NetworkMonitor();
  monitor.start().catch(console.error);
}