# Remote Pinning Guide

This guide explains how to use the remote pinning functionality in Cinderlink with the `@helia/remote-pinning` package.

## Overview

Remote pinning allows you to pin content to external pinning services like Pinata, Web3.Storage, or any service that implements the IPFS Pinning Service API. This ensures your content remains available even when your local node is offline.

## Distributed Pinning Strategy

Cinderlink now supports a distributed pinning strategy that combines:
1. **Local pinning** - Always pins to your local node first
2. **Peer pinning** - Distributes content to connected network nodes
3. **Remote pinning** - Optionally pins to Pinata if API key is present

### Automatic Distributed Pinning

When using the DAG API with `pin: true`, content is automatically distributed:

```typescript
import { createClient } from '@cinderlink/client';

const client = await createClient({
  nodes: [
    // Your network nodes
    '/ip4/192.168.1.100/tcp/4500/p2p/12D3KooW...',
    '/ip4/192.168.1.101/tcp/4500/p2p/12D3KooW...'
  ]
});

// This automatically uses distributed pinning
const cid = await client.dag.store(data, { pin: true });
// Pinned to: local, 2 peers, Pinata (if configured)
```

### Using DistributedPinningManager Directly

For more control over the pinning process:

```typescript
import { DistributedPinningManager } from '@cinderlink/client';

const distributedPinning = new DistributedPinningManager(client, {
  pinToPeers: true,      // Pin to connected nodes (default: true)
  minPeerPins: 2,        // Minimum peer pins required (default: 1)
  usePinata: true,       // Use Pinata if available (default: true)
  timeout: 30000         // Operation timeout in ms (default: 30000)
});

// Pin with full status report
const results = await distributedPinning.pin(cid, {
  name: 'Important Document',
  meta: { version: '1.0' }
});

console.log('Pinning results:', {
  local: results.local,           // true/false
  peers: results.peers.length,    // Number of peers
  remote: results.remote,          // true/false (Pinata)
  errors: results.errors           // Any failures
});
```

### Environment Configuration

Set the Pinata API key to enable remote pinning:

```bash
# .env file
PINATA_API_KEY=your_pinata_api_key
```

When this environment variable is set, Pinata will be automatically configured as an additional pinning service.

### Checking Pin Status

Query the distributed pin status across all locations:

```typescript
const status = await distributedPinning.getStatus(cid);
console.log('Pin status:', {
  local: status.local,     // Pinned locally
  remote: status.remote,   // Pinned to Pinata
  peers: status.peers      // Number of peers with content
});
```

### Unpinning Content

Remove pins from all locations:

```typescript
// Remove from everywhere
await distributedPinning.unpin(cid);

// Or selectively
await distributedPinning.unpin(cid, {
  skipLocal: false,   // Keep local pin
  skipRemote: true    // Don't unpin from Pinata
});
```

## Setup

The remote pinning functionality is automatically initialized when creating a Helia node through Cinderlink:

```typescript
import { createClient } from '@cinderlink/client';

// Create client with remote pinning support
const client = await createClient({
  // Your configuration
});

// The client.ipfs instance now has remotePins available
```

## Using the RemotePinningManager

The `RemotePinningManager` class provides a convenient interface for remote pinning operations:

```typescript
import { RemotePinningManager } from '@cinderlink/client';
import { CID } from 'multiformats/cid';

// Initialize the manager
const pinManager = new RemotePinningManager(client);

// Add a pinning service (e.g., Pinata)
await pinManager.addService('pinata', 
  new URL('https://api.pinata.cloud/psa'),
  process.env.PINATA_API_KEY
);
```

## Common Operations

### Pin Content Remotely

```typescript
// Pin a CID to remote service
const cid = CID.parse('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');

await pinManager.addRemotePin(cid, {
  service: 'pinata',
  name: 'My Important File',
  meta: {
    description: 'User profile data'
  }
});
```

### List Remote Pins

```typescript
// List all remote pins
const pins = await pinManager.listRemotePins({
  service: 'pinata',
  status: ['pinned']
});

console.log('Remote pins:', pins);
```

### Remove Remote Pin

```typescript
// Unpin from remote service
await pinManager.removeRemotePin(cid, {
  service: 'pinata'
});
```

### Replace Remote Pins

Replace all existing pins with a new set:

```typescript
const newCids = [
  CID.parse('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'),
  CID.parse('bafkreifjjcie6lypi6ny7amxnfftagclbuxndqonfipmb64f2km2devei4')
];

await pinManager.replaceRemotePins(newCids, {
  service: 'pinata'
});
```

## Direct API Usage

You can also use the remote pinning API directly:

```typescript
// Check if remote pinning is available
if (client.ipfs.remotePins) {
  // Add a pin
  await client.ipfs.remotePins.add(cid, {
    service: 'pinata',
    name: 'Direct pin'
  });

  // List pins
  for await (const pin of client.ipfs.remotePins.ls()) {
    console.log(`Pin ${pin.cid} status: ${pin.status}`);
  }

  // Remove a pin
  for await (const unpinned of client.ipfs.remotePins.rm(cid)) {
    console.log(`Unpinned: ${unpinned.cid}`);
  }
}
```

## Service Management

### List Services

```typescript
const services = await pinManager.listServices();
services.forEach(service => {
  console.log(`Service: ${service.name}`);
  console.log(`Endpoint: ${service.endpoint}`);
  console.log(`Status: ${service.stat?.status}`);
});
```

### Remove Service

```typescript
await pinManager.removeService('pinata');
```

## Configuration in Helia Node Creation

You can configure remote pinning services during Helia node creation:

```typescript
import { createHeliaNode } from '@cinderlink/client/ipfs/create';

const helia = await createHeliaNode([], {
  // Other Helia options...
});

// Remote pinning is automatically initialized
// Configure services after creation
if (helia.remotePins) {
  await helia.remotePins.addService('web3storage', {
    endpoint: new URL('https://api.web3.storage/'),
    key: process.env.WEB3_STORAGE_TOKEN
  });
}
```

## Environment Variables

For security, store your API keys in environment variables:

```bash
# .env file
PINATA_API_KEY=your_pinata_api_key
WEB3_STORAGE_TOKEN=your_web3_storage_token
```

## Error Handling

Always check if remote pinning is configured:

```typescript
try {
  await pinManager.addRemotePin(cid);
} catch (error) {
  if (error.message === 'Remote pinning not configured') {
    console.log('Remote pinning is not available');
  } else {
    console.error('Pin failed:', error);
  }
}
```

## Supported Services

Any service that implements the [IPFS Pinning Service API](https://ipfs.github.io/pinning-services-api-spec/) is supported:

- Pinata (https://pinata.cloud)
- Web3.Storage (https://web3.storage)
- Filebase (https://filebase.com)
- Custom pinning services

## Best Practices

1. **Always verify remote pinning availability** before using it
2. **Use descriptive names** for your pins to make management easier
3. **Store API keys securely** in environment variables
4. **Monitor pin status** as pinning can take time for large files
5. **Implement retry logic** for network failures
6. **Clean up unused pins** to avoid unnecessary storage costs
7. **Configure multiple nodes** for better redundancy in your network
8. **Set appropriate timeouts** based on your content size and network speed
