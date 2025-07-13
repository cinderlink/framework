import { createClient, DistributedPinningManager } from '@cinderlink/client';

/**
 * Example demonstrating distributed pinning with Cinderlink
 * - Pins to local node
 * - Distributes to connected network nodes
 * - Optionally pins to Pinata if API key is available
 */
async function distributedPinningExample() {
  // Create Cinderlink client with network nodes
  const client = await createClient({
    nodes: [
      // Add your network nodes here
      // Example: '/ip4/192.168.1.100/tcp/4500/p2p/12D3KooW...'
    ]
  });

  console.log('🚀 Cinderlink client started');

  // Example 1: Simple DAG storage with automatic distributed pinning
  console.log('\n📌 Example 1: Automatic distributed pinning');
  const content = { 
    message: 'Hello from Cinderlink!',
    timestamp: new Date().toISOString(),
    version: '1.0'
  };

  // This automatically uses distributed pinning when pin: true
  const cid = await client.dag.store(content, { 
    pin: true 
  });
  console.log(`✅ Content stored and distributed: ${cid}`);

  // Example 2: Using DistributedPinningManager for more control
  console.log('\n📌 Example 2: Manual distributed pinning with status');
  const pinManager = new DistributedPinningManager(client, {
    pinToPeers: true,
    minPeerPins: 1,
    usePinata: true, // Will use Pinata if PINATA_API_KEY is set
    timeout: 30000
  });

  // Store more content
  const importantData = {
    type: 'important-document',
    data: 'This needs to be highly available',
    createdAt: new Date().toISOString()
  };

  const importantCid = await client.dag.store(importantData, { pin: false });
  
  // Manually pin with detailed results
  const pinResults = await pinManager.pin(importantCid, {
    name: 'Important Document',
    meta: {
      type: 'document',
      priority: 'high'
    }
  });

  console.log('\nPinning Results:');
  console.log(`- Local: ${pinResults.local ? '✅' : '❌'}`);
  console.log(`- Peers: ${pinResults.peers.length} nodes`);
  if (pinResults.peers.length > 0) {
    console.log(`  Peer IDs: ${pinResults.peers.slice(0, 3).join(', ')}${pinResults.peers.length > 3 ? '...' : ''}`);
  }
  console.log(`- Pinata: ${pinResults.remote ? '✅' : '❌ (Set PINATA_API_KEY to enable)'}`);
  
  if (pinResults.errors.length > 0) {
    console.log('\n⚠️ Some operations failed:');
    pinResults.errors.forEach(err => {
      console.log(`  - ${err.location}: ${err.error.message}`);
    });
  }

  // Example 3: Check pin status across all locations
  console.log('\n📊 Example 3: Checking pin status');
  const status = await pinManager.getStatus(importantCid);
  console.log('Pin Status:');
  console.log(`- Local node: ${status.local ? 'Pinned ✅' : 'Not pinned ❌'}`);
  console.log(`- Remote (Pinata): ${status.remote ? 'Pinned ✅' : 'Not pinned ❌'}`);
  console.log(`- Available from ${status.peers} peer(s)`);

  // Example 4: List all pins
  console.log('\n📋 Example 4: Listing all pins');
  const allPins = await pinManager.listPins();
  console.log(`Local pins: ${allPins.local.length}`);
  console.log(`Remote pins: ${allPins.remote.length}`);
  
  if (allPins.remote.length > 0) {
    console.log('\nRemote pins on Pinata:');
    allPins.remote.forEach(pin => {
      console.log(`- ${pin.cid} (${pin.status}) ${pin.name || 'unnamed'}`);
    });
  }

  // Example 5: Selective unpinning
  console.log('\n🧹 Example 5: Selective unpinning');
  
  // Keep local and peer copies, but remove from Pinata
  await pinManager.unpin(cid, {
    skipLocal: true,
    skipRemote: false
  });
  console.log('✅ Removed from Pinata while keeping local/peer copies');

  // Example 6: Monitor network peers
  console.log('\n🌐 Example 6: Network status');
  const connections = client.ipfs.libp2p.getConnections();
  console.log(`Connected to ${connections.length} peer(s)`);
  
  // Show server nodes if any  
  const peers = client.peers as { getPeersByRole?: (role: string) => Set<string> };
  const serverPeers = Array.from(peers.getPeersByRole?.('server') || []);
  if (serverPeers.length > 0) {
    console.log(`Server nodes: ${serverPeers.length}`);
  }

  // Clean up
  console.log('\n🧹 Cleaning up...');
  await pinManager.unpin(importantCid);
  await client.stop();
  console.log('✅ Done!');
}

// Helper to demonstrate pinning strategies
function showPinningStrategy() {
  console.log(`
Cinderlink Distributed Pinning Strategy:
========================================
1. Local First: Always pin to your local node
2. Network Distribution: Share with connected peers
3. Cloud Backup: Optionally pin to Pinata (if API key set)

Benefits:
- High availability across your network
- Redundancy through multiple nodes
- Optional cloud backup for critical data
- Automatic failover if nodes go offline

Set PINATA_API_KEY environment variable to enable cloud backup.
`);
}

// Run the example
showPinningStrategy();
distributedPinningExample().catch(console.error);
