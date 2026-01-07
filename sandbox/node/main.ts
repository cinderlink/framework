import { createClient } from '@cinderlink/client';
import { createDID, createSeed, signAddressVerification } from '@cinderlink/identifiers';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Import all available plugins
import { IdentityServerPlugin } from '@cinderlink/plugin-identity-server';
import { OfflineSyncServerPlugin } from '@cinderlink/plugin-offline-sync-server';
import { SocialServerPlugin } from '@cinderlink/plugin-social-server';
import { RconServerPlugin } from '@cinderlink/plugin-rcon-server';
import { SyncDBPlugin } from '@cinderlink/plugin-sync-db';

async function startNode() {
  console.log('Starting Cinderlink Node Server...');

  // Generate a deterministic private key for the server
  const privateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  
  // Create wallet client
  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  });

  // Create DID for the server
  const seed = await createSeed('cinderlink-node-server');
  const did = await createDID(seed);
  
  // Sign address verification
  const addressVerification = await signAddressVerification(
    'cinderlink-node',
    did.id,
    account,
    walletClient
  );

  // Create the server client
  const client = await createClient({
    did,
    address: account.address,
    addressVerification,
    role: 'server',
    options: {
      repo: './sandbox/node/ipfs-repo',
      config: {
        Addresses: {
          Swarm: [
            '/ip4/0.0.0.0/tcp/4001',
            '/ip4/0.0.0.0/tcp/4002/ws'
          ],
          API: '/ip4/127.0.0.1/tcp/5001',
          Gateway: '/ip4/127.0.0.1/tcp/8080'
        },
        Bootstrap: [], // No bootstrap peers - this is an anchor node
      },
    },
  });

  // Load all server plugins
  console.log('Loading plugins...');
  
  // Core plugins
  await client.plugins.load(new SyncDBPlugin(client));
  await client.plugins.load(new IdentityServerPlugin(client));
  await client.plugins.load(new OfflineSyncServerPlugin(client));
  
  // Feature plugins
  await client.plugins.load(new SocialServerPlugin(client));
  await client.plugins.load(new RconServerPlugin(client, {
    port: 25575,
    password: 'test-password'
  }));

  // Start the client
  console.log('Starting client...');
  await client.start();

  console.log(`Node server started successfully!`);
  console.log(`DID: ${did.id}`);
  console.log(`Address: ${account.address}`);
  console.log(`Peer ID: ${client.ipfs.libp2p.peerId}`);
  console.log(`Swarm addresses:`);
  
  const addresses = client.ipfs.libp2p.getMultiaddrs();
  addresses.forEach(addr => {
    console.log(`  ${addr.toString()}`);
  });

  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await client.stop();
    process.exit(0);
  });
}

// Start the node
startNode().catch(console.error);