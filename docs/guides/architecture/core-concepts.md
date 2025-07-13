# Core Concepts

## Overview

The Cinderlink framework is built around several core concepts that work together to enable decentralized application development. Understanding these concepts is essential for effectively using the framework.

## Architecture Pillars

### 1. **Decentralized Identity (DIDs)**

Every entity in the Cinderlink network has a **Decentralized Identifier (DID)** that provides:
- **Self-sovereign identity** - No central authority controls your identity
- **Cryptographic verification** - All interactions are cryptographically signed
- **Ethereum wallet integration** - Leverage existing wallet infrastructure

```typescript
// Creating and managing identities
import { IdentifierManager } from '@cinderlink/identifiers';

const identityManager = new IdentifierManager();
const identity = await identityManager.create();
console.log(identity.did); // did:key:z6Mk...
```

### 2. **Peer-to-Peer Networking**

The framework uses **libp2p** for peer-to-peer communication, providing:
- **Direct peer connections** - No intermediary servers required
- **Multiple transport protocols** - WebSocket, TCP, WebRTC support
- **NAT traversal** - Automatic connection establishment
- **Content routing** - Distributed hash table (DHT) for peer discovery

```typescript
// P2P client setup
import { CinderlinkClient } from '@cinderlink/client';

const client = new CinderlinkClient({
  identity: identity,
  networking: {
    transports: ['websocket', 'tcp'],
    enableDHT: true
  }
});

await client.start();
```

### 3. **Content-Addressed Storage (IPLD)**

Data storage uses **InterPlanetary Linked Data (IPLD)** with:
- **Content addressing** - Data referenced by cryptographic hash
- **Immutable data structures** - Data cannot be modified once stored
- **Distributed storage** - Data can be stored across multiple nodes
- **Schema-based organization** - Structured data with type safety

```typescript
// Schema-based data storage
import { Schema } from '@cinderlink/ipld-database';

const schema = new Schema('my-app', {
  users: {
    schemaId: 'users',
    schemaVersion: 1,
    // ... table definition
  }
});

const usersTable = schema.getTable('users');
await usersTable.insert({ name: 'Alice', email: 'alice@example.com' });
```

### 4. **Plugin Architecture**

Functionality is organized into **plugins** that provide:
- **Modular capabilities** - Add only the features you need
- **Event-driven communication** - Plugins communicate via typed events
- **Composable functionality** - Combine plugins for complex applications
- **Type-safe interfaces** - Strong TypeScript typing throughout

```typescript
// Plugin system usage
import { SyncDBPlugin } from '@cinderlink/plugin-sync-db';
import { SocialClientPlugin } from '@cinderlink/plugin-social-client';

// Add plugins to client
client.addPlugin('sync', new SyncDBPlugin(client));
client.addPlugin('social', new SocialClientPlugin(client));
```

## Data Flow Architecture

### **Event-Driven Communication**

All communication in Cinderlink follows an event-driven pattern:

```
┌─────────────┐    Events    ┌─────────────┐    Events    ┌─────────────┐
│   Plugin A  │──────────────│   Client    │──────────────│   Plugin B  │
└─────────────┘              └─────────────┘              └─────────────┘
       │                           │                           │
       │                           │                           │
       ▼                           ▼                           ▼
┌─────────────┐              ┌─────────────┐              ┌─────────────┐
│    IPLD     │              │   libp2p    │              │   Remote    │
│  Database   │              │  Network    │              │    Peers    │
└─────────────┘              └─────────────┘              └─────────────┘
```

### **Message Types**

The framework supports different message types for different use cases:

#### **P2P Messages** - Direct peer-to-peer communication
```typescript
// Send direct message to specific peer
await client.send(peerId, {
  topic: '/my-app/direct-message',
  payload: { content: 'Hello!' }
});
```

#### **PubSub Messages** - Broadcast to multiple peers
```typescript
// Publish to topic subscribers
await client.publish('/my-app/announcements', {
  type: 'user-joined',
  user: 'Alice'
});
```

#### **Internal Events** - Plugin-to-plugin communication
```typescript
// Internal event emission
plugin.emit('/my-plugin/data-updated', {
  recordId: 'abc123',
  changes: { status: 'active' }
});
```

## Security Model

### **Cryptographic Foundations**

Security is built on **cryptographic primitives**:
- **Ed25519 signatures** - All messages cryptographically signed
- **X25519 encryption** - End-to-end encryption for sensitive data
- **Content addressing** - Data integrity through cryptographic hashes
- **Key rotation** - Support for updating cryptographic keys

### **Trust Model**

The framework operates on a **zero-trust model**:
- **No central authority** - No single point of trust or failure
- **Cryptographic verification** - All claims verified cryptographically
- **Explicit trust decisions** - Applications decide what/whom to trust
- **Auditability** - All operations leave cryptographic audit trails

### **Permission Model**

Access control is managed through:
- **Capability-based security** - Permissions as transferable capabilities
- **Plugin isolation** - Plugins cannot access each other's data directly
- **Explicit authorization** - All cross-plugin access requires permission
- **Revocable permissions** - Access can be revoked at any time

## Development Patterns

### **Schema-First Development**

Define your data structures first:

```typescript
// 1. Define your data schema
interface UserProfile extends TableRow {
  name: string;
  email: string;
  avatar?: string;
}

// 2. Create table definition
const UserTableDef: TableDefinition<UserProfile> = {
  schemaId: 'user-profiles',
  schemaVersion: 1,
  encrypted: false,
  indexes: {
    email: { unique: true, fields: ['email'] }
  }
};

// 3. Use in application
const users = schema.getTable<UserProfile>('users');
```

### **Plugin-Based Architecture**

Organize functionality into focused plugins:

```typescript
// Each plugin handles a specific domain
class MyAppPlugin extends Emittery implements PluginInterface {
  id = 'my-app';
  
  async start() {
    // Initialize plugin functionality
    this.client.on('/peer/connected', this.onPeerConnected);
  }
  
  private async onPeerConnected(peer: Peer) {
    // Handle peer connections
  }
}
```

### **Type-Safe Event Handling**

Leverage TypeScript for event safety:

```typescript
// Define your event types
interface MyAppEvents extends PluginEventDef {
  send: {
    '/my-app/user-message': { from: string; content: string; };
  };
  receive: {
    '/my-app/user-message': { from: string; content: string; };
  };
}

// Use typed event handling
class MyAppPlugin<
  Client extends CinderlinkClientInterface<MyAppEvents>
> implements PluginInterface<MyAppEvents> {
  // Type-safe event handlers
}
```

## Deployment Patterns

### **Client-Only Applications**

Pure peer-to-peer applications with no server:

```typescript
const client = new CinderlinkClient({
  identity: await createIdentity(),
  plugins: {
    sync: new SyncDBPlugin(),
    social: new SocialClientPlugin()
  }
});

await client.start();
// Application runs entirely in browser/device
```

### **Federated Applications**

Applications with optional server components:

```typescript
// Server provides relay and discovery services
const server = new CinderlinkServer({
  port: 3000,
  enableRelay: true,
  enableDiscovery: true
});

// Clients can connect to server for improved connectivity
const client = new CinderlinkClient({
  bootstrapServers: ['wss://my-server.com']
});
```

### **Hybrid Deployments**

Combine P2P with traditional infrastructure:

```typescript
// Use IPFS pinning services for data persistence
const client = new CinderlinkClient({
  storage: {
    remote: {
      url: 'https://my-pinning-service.com',
      token: process.env.PINNING_TOKEN
    }
  }
});
```

## Next Steps

Now that you understand the core concepts, explore:

1. **[Plugin System Architecture](./plugin-system.md)** - Deep dive into plugin development
2. **[Data Layer Details](./data-layer.md)** - Understanding IPLD and schemas
3. **[P2P Networking](./p2p-networking.md)** - Networking and communication patterns
4. **[Identity System](./identity-system.md)** - DID management and security

Or jump into practical development:

1. **[Creating Your First App](../../tutorials/02-creating-your-first-app.md)** - Build a complete application
2. **[Plugin Development](../../tutorials/05-plugin-development.md)** - Create custom plugins
3. **[API Reference](../../api/)** - Detailed API documentation