/**
 * Containerized Server Example
 * 
 * This server is designed to run in Docker containers with environment-based configuration.
 * It supports the multi-node P2P testing environment.
 */

import { CinderlinkClient } from "@cinderlink/client";
import { createSeed, createDID } from "@cinderlink/identifiers";

// Configuration from environment variables
const config = {
  role: (process.env.CINDERLINK_ROLE || 'server') as 'server' | 'bootstrap' | 'client',
  port: parseInt(process.env.CINDERLINK_PORT || '4001'),
  apiPort: parseInt(process.env.CINDERLINK_API_PORT || '5001'),
  dataDir: process.env.CINDERLINK_DATA_DIR || '/app/data',
  bootstrapPeers: (process.env.CINDERLINK_BOOTSTRAP_PEERS || '').split(',').filter(Boolean),
  bootstrapMode: process.env.CINDERLINK_BOOTSTRAP_MODE === 'true',
  testMode: process.env.CINDERLINK_TEST_MODE === 'true',
  fastStartup: process.env.CINDERLINK_FAST_STARTUP === 'true'
};

console.log('🚀 Starting Cinderlink Server...');
console.log('📋 Configuration:', JSON.stringify(config, null, 2));

try {
  // Create DID for the server
  const seedPhrase = config.bootstrapMode 
    ? "bootstrap-node-seed-phrase-for-testing"
    : `${config.role}-node-${config.port}-seed-phrase`;
  
  const seed = await createSeed(seedPhrase);
  const did = await createDID(seed);
  
  console.log('🆔 Server DID:', did.id);
  console.log('🎯 Server Role:', config.role);
  
  // Create and configure client
  const client = new CinderlinkClient({
    did,
    role: config.role,
    bootstrapPeers: config.bootstrapPeers,
    dataDir: config.dataDir,
    testMode: config.testMode,
    keepAliveInterval: config.fastStartup ? 2000 : 5000,
    keepAliveTimeout: config.fastStartup ? 10000 : 30000
  });

  // Add health check endpoint (simulated)
  if (config.apiPort) {
    console.log(`🏥 Health check available on port ${config.apiPort}`);
    // In a real implementation, this would set up an HTTP server
    // For now, we'll just log that it's "available"
  }

  // Start the client
  await client.start();
  console.log(`✅ ${config.role} server started successfully!`);
  console.log(`📡 P2P Port: ${config.port}`);
  console.log(`🌐 API Port: ${config.apiPort}`);
  console.log(`📁 Data Directory: ${config.dataDir}`);
  
  if (config.bootstrapPeers.length > 0) {
    console.log(`🔗 Bootstrap Peers: ${config.bootstrapPeers.join(', ')}`);
  }

  // Log connected peers periodically
  const logInterval = setInterval(() => {
    const peerCount = client.peers.getAllPeers().length;
    console.log(`📊 Connected peers: ${peerCount}`);
    
    if (peerCount > 0) {
      const peers = client.peers.getAllPeers().slice(0, 3);
      peers.forEach((peer, index) => {
        const peerId = peer.peerId.toString().slice(-8);
        const did = peer.did ? peer.did.slice(-8) + '...' : 'unknown';
        console.log(`  ${index + 1}. ${peerId}... (${did})`);
      });
      
      if (client.peers.getAllPeers().length > 3) {
        console.log(`  ... and ${client.peers.getAllPeers().length - 3} more`);
      }
    }
  }, 10000);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('🛑 Shutting down server...');
    clearInterval(logInterval);
    
    try {
      await client.stop();
      console.log('✅ Server stopped successfully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
    
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGUSR1', shutdown);
  process.on('SIGUSR2', shutdown);

  // Keep the process alive
  process.stdin.resume();

} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
