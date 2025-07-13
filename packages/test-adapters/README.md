# @cinderlink/test-adapters

Test utilities and adapters for testing Cinderlink applications.

## Overview

This package provides test doubles and utilities for testing Cinderlink applications, including mock implementations of core interfaces and helper functions for setting up test environments.

## Installation

```bash
bun add --dev @cinderlink/test-adapters
```

## Test Doubles

### TestClient

A mock implementation of `CinderlinkClientInterface` for testing plugins and client applications.

```typescript
import { TestClient } from '@cinderlink/test-adapters';
import { DID } from 'dids';

// Create a test client with a mock DID
const did = new DID({ 
  resolver: { resolve: async () => ({ idDocument: { id: 'did:test:123' } }) } 
});
const client = new TestClient(did);

// Use the client in your tests
await client.start();
```

### TestDag / TestDIDDag

In-memory implementations of `DAGInterface` and `DIDDagInterface` for testing IPLD operations.

```typescript
import { TestDIDDag } from '@cinderlink/test-adapters';
import { DID } from 'dids';

const did = new DID({ /* ... */ });
const dag = new TestDIDDag(did);

// Store and load data
const cid = await dag.store({ foo: 'bar' });
const data = await dag.load(cid);
```

### Peerstore

In-memory implementation of `PeerStoreInterface` for testing peer management.

```typescript
import { Peerstore } from '@cinderlink/test-adapters';
import { peerIdFromString } from '@libp2p/peer-id';

const peerstore = new Peerstore('test-peer');
const peerId = peerIdFromString('Qm...');

// Add a peer
peerstore.addPeer(peerId, 'server', 'did:test:123');

// Check if peer exists
const hasPeer = peerstore.hasPeer(peerId.toString());
```

### TestLogger

A simple logger implementation for testing logging functionality.

```typescript
import { TestLogger } from '@cinderlink/test-adapters';

const logger = new TestLogger('test');
logger.info('test-module', 'Hello, world!');
```

## Testing Plugins

Here's an example of testing a Cinderlink plugin using the test adapters:

```typescript
import { TestClient } from '@cinderlink/test-adapters';
import { DID } from 'dids';
import MyPlugin from '../src';

describe('MyPlugin', () => {
  let client;
  let plugin;

  beforeEach(async () => {
    const did = new DID({ 
      resolver: { resolve: async () => ({ idDocument: { id: 'did:test:123' } }) } 
    });
    client = new TestClient(did);
    plugin = new MyPlugin(client, {});
    client.addPlugin(plugin);
    await client.start();
  });

  afterEach(async () => {
    await client.stop();
  });

  it('should initialize correctly', () => {
    expect(plugin).toBeDefined();
  });
});
```

## API Reference

### TestClient

Implements `CinderlinkClientInterface` with in-memory storage and event emitters.

**Properties:**
- `did`: The DID instance used by the client
- `peers`: Instance of `Peerstore` for managing peers
- `dag`: Instance of `TestDIDDag` for DAG operations
- `logger`: Instance of `TestLogger` for logging

**Methods:**
- `start()`: Initialize the client
- `stop()`: Stop the client
- `addPlugin(plugin)`: Add a plugin to the client
- `getPlugin(id)`: Get a plugin by ID
- `publish(topic, message)`: Publish a message to a topic
- `subscribe(topic, handler)`: Subscribe to a topic

### TestDag / TestDIDDag

In-memory implementations of DAG interfaces with support for encryption.

**Methods:**
- `store(data)`: Store data in the DAG
- `load(cid, path)`: Load data from the DAG
- `storeEncrypted(data, recipients)`: Store encrypted data
- `loadEncrypted(cid)`: Load encrypted data
- `loadDecrypted(cid)`: Load and decrypt data

### Peerstore

In-memory peer store implementation.

**Methods:**
- `addPeer(peerId, role, did)`: Add a peer
- `getPeer(peerId)`: Get a peer by ID
- `getPeers()`: Get all peers
- `getServers()`: Get all server peers
- `hasPeer(peerId)`: Check if peer exists
- `updatePeer(peerId, updates)`: Update peer information

## Best Practices

1. **Isolate Tests**: Each test should set up its own client and plugins
2. **Clean Up**: Always stop clients after tests to clean up resources
3. **Mock Dependencies**: Use the provided test doubles to isolate units
4. **Test Events**: Use the event emitters to test event-based behavior

## License

MIT
