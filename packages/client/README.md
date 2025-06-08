# @cinderlink/client

Core client for the Cinderlink P2P network.

## Overview

The Cinderlink client is the main entry point for building decentralized applications on the Cinderlink network. It provides a unified interface for identity management, P2P networking, data storage, and plugin integration.

## Features

- **Decentralized Identity**: Built-in DID (Decentralized Identifier) support
- **P2P Networking**: Powered by libp2p and IPFS
- **Data Storage**: IPLD-based database with schema support
- **Plugin System**: Extensible architecture for adding new functionality
- **Event System**: Reactive programming model with typed events
- **Cross-Platform**: Works in both Node.js and browser environments

## Installation

```bash
npm install @cinderlink/client
# or
yarn add @cinderlink/client
```

## Quick Start

### Creating a Client

```typescript
import { createClient } from '@cinderlink/client';

// Basic configuration
const client = await createClient({
  // Node configuration
  node: {
    // Optional: Provide your own libp2p configuration
    // Defaults to sensible defaults for the current environment
  },
  
  // Identity configuration
  identity: {
    // Optional: Provide an existing DID or seed
    // If not provided, a new identity will be generated
    did: 'did:key:z6Mk...',
    seed: new Uint8Array(32)
  },
  
  // Storage configuration
  storage: {
    // Directory to store node data (Node.js only)
    // In browsers, uses IndexedDB by default
    repo: './.cinderlink',
    
    // Optional: Custom storage backends
    // ipfs: { ... }
  },
  
  // Logging configuration
  logger: {
    level: 'info', // 'error', 'warn', 'info', 'debug', 'trace'
    name: 'my-app'
  }
});

// Start the client
await client.start();

// Your app code here...

// Stop the client when done
await client.stop();
```

## Core Concepts

### Identity

Manage your node's identity:

```typescript
// Get the node's DID
const did = client.did;

// Sign a message
const signature = await client.sign('message');

// Verify a signature
const isValid = await client.verify('message', signature, did);
```

### Database

Work with IPLD databases:

```typescript
// Define a schema
const schema = new Schema('my-app', {
  todos: new Table<Todo>('todos', {
    definition: {
      id: { type: 'string' },
      title: { type: 'string' },
      completed: { type: 'boolean' }
    }
  })
});

// Load the schema
await client.schema.load(schema);

// Get a table
const todos = client.schema.getTable('my-app', 'todos');

// Insert data
const todoId = await todos.insert({
  title: 'Learn Cinderlink',
  completed: false
});

// Query data
const todo = await todos.get(todoId);
```

### Plugins

Extend the client with plugins:

```typescript
import { PluginInterface } from '@cinderlink/core-types';

class MyPlugin implements PluginInterface {
  static id = 'my-plugin';
  
  constructor(public client: CinderlinkClientInterface) {}
  
  async start() {
    console.log('My plugin started');
  }
  
  async stop() {
    console.log('My plugin stopped');
  }
}

// Register the plugin
await client.addPlugin(new MyPlugin(client));
```

### Events

Listen for client events:

```typescript
// Lifecycle events
client.on('start', () => console.log('Client started'));
client.on('stop', () => console.log('Client stopped'));

// Peer events
client.on('peer:connect', (peerId) => console.log('Peer connected:', peerId));
client.on('peer:disconnect', (peerId) => console.log('Peer disconnected:', peerId));

// Database events
client.on('document:insert', (table, doc) => console.log('Document inserted:', table, doc));
client.on('document:update', (table, doc) => console.log('Document updated:', table, doc));
client.on('document:delete', (table, doc) => console.log('Document deleted:', table, doc));
```

## Advanced Usage

### Custom Transports

Configure custom transports for libp2p:

```typescript
const client = await createClient({
  node: {
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0',
        '/ip4/0.0.0.0/tcp/0/ws'
      ]
    },
    transports: [
      transport.tcp(),
      transport.webSockets()
    ],
    connectionEncryption: [
      noise()
    ],
    streamMuxers: [
      mplex()
    ],
    peerDiscovery: [
      bootstrap({
        list: [
          '/dns4/bootstrap1.example.com/tcp/4001/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
          '/dns4/bootstrap2.example.com/tcp/4001/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb'
        ]
      })
    ]
  }
});
```

### Custom Storage

Configure custom storage backends:

```typescript
const client = await createClient({
  storage: {
    repo: './.cinderlink',
    ipfs: {
      repo: './.cinderlink/ipfs',
      init: { 
        algorithm: 'ed25519',
        bits: 2048 
      },
      config: {
        Addresses: {
          Swarm: [
            '/ip4/0.0.0.0/tcp/4002',
            '/ip4/127.0.0.1/tcp/4003/ws'
          ]
        }
      }
    }
  }
});
```

## Security Considerations

- Always validate and sanitize user input
- Use proper authentication and authorization
- Encrypt sensitive data
- Keep dependencies up to date
- Follow security best practices for your use case

## Performance

- Use pagination for large datasets
- Consider indexing frequently queried fields
- Use streaming for large file transfers
- Monitor memory usage in long-running applications

## Contributing

Contributions are welcome! Please ensure all code follows the project's coding standards and includes appropriate tests.
