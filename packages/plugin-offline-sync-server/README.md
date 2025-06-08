# @cinderlink/plugin-offline-sync-server

Server plugin for offline message synchronization in Cinderlink applications.

## Overview

This plugin enables Cinderlink servers to store and relay messages for offline clients. It works in conjunction with the `@cinderlink/plugin-offline-sync-client` to provide reliable message delivery even when recipients are temporarily offline.

## Features

- **Message Storage**: Securely store messages for offline recipients
- **Message Relay**: Deliver messages when recipients come online
- **Message Expiration**: Automatically expire old messages
- **Rate Limiting**: Prevent abuse with configurable rate limits
- **Message Encryption**: End-to-end encryption for message privacy

## Installation

```bash
npm install @cinderlink/plugin-offline-sync-server
# or
yarn add @cinderlink/plugin-offline-sync-server
```

## Quick Start

### Server Setup

```typescript
import { createServer } from '@cinderlink/server';
import { OfflineSyncServerPlugin } from '@cinderlink/plugin-offline-sync-server';

const server = await createServer({
  // Server configuration
});

// Add the offline sync server plugin
const offlineSync = new OfflineSyncServerPlugin({
  // Configuration options
  messageTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxMessagesPerRecipient: 1000,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
});

await server.addPlugin(offlineSync);

// Start the server
await server.start();
```

### Client Configuration

Clients need to be configured with the server's peer ID to use the offline sync service:

```typescript
import { createClient } from '@cinderlink/client';
import { OfflineSyncClientPlugin } from '@cinderlink/plugin-offline-sync-client';

const client = await createClient({
  // Client configuration
});

const offlineSync = new OfflineSyncClientPlugin({
  serverPeerId: '12D3KooW...' // Server's peer ID
});

await client.addPlugin(offlineSync);
await client.start();
```

## Configuration Options

### `OfflineSyncServerOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `messageTTL` | `number` | `604800000` (7 days) | Time in milliseconds before messages expire |
| `maxMessagesPerRecipient` | `number` | `1000` | Maximum number of messages to store per recipient |
| `rateLimit` | `RateLimitOptions` | See below | Rate limiting configuration |
| `storagePath` | `string` | `'./.cinderlink/offline-sync'` | Path to store message data |
| `cleanupInterval` | `number` | `3600000` (1 hour) | Interval for cleaning up expired messages |

### `RateLimitOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `windowMs` | `number` | `900000` (15 minutes) | Time window for rate limiting |
| `max` | `number` | `100` | Maximum number of requests per window |
| `message` | `string` | `'Too many requests'` | Error message |
| `statusCode` | `number` | `429` | HTTP status code for rate-limited requests |

## API Reference

### `OfflineSyncServerPlugin`

#### `constructor(options?: OfflineSyncServerOptions)`

Create a new offline sync server plugin.

#### `getMessageCount(recipientDid: string): Promise<number>`

Get the number of pending messages for a recipient.

#### `getMessages(recipientDid: string, options?: { limit?: number; offset?: number }): Promise<Message[]>`

Get pending messages for a recipient.

#### `deleteMessage(messageId: string): Promise<void>`

Delete a message by ID.

#### `clearMessages(recipientDid: string): Promise<void>`

Delete all messages for a recipient.

### Events

#### `message:stored`
Emitted when a new message is stored.

#### `message:delivered`
Emitted when a message is successfully delivered.

#### `message:expired`
Emitted when a message expires.

#### `message:deleted`
Emitted when a message is deleted.

## Message Storage

Messages are stored in an IPLD database with the following schema:

```typescript
interface StoredMessage {
  id: string;
  sender: string;
  recipient: string;
  topic: string;
  payload: string;
  payloadCid?: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'delivered' | 'failed' | 'expired';
  attempts: number;
  lastAttemptAt?: number;
  error?: string;
}
```

## Security Considerations

### Message Privacy

- Message payloads are encrypted by the client before being sent to the server
- The server cannot read the contents of encrypted messages
- Message metadata (sender, recipient, timestamp) is not encrypted

### Rate Limiting

Rate limiting is enabled by default to prevent abuse. Configure the `rateLimit` option to adjust the limits.

### Storage Security

- Message data is stored on disk in the specified `storagePath`
- Ensure the storage directory has appropriate permissions
- Consider encrypting the storage volume for additional security

## Example: Custom Message Handler

```typescript
import { OfflineSyncServerPlugin } from '@cinderlink/plugin-offline-sync-server';

class CustomOfflineSync extends OfflineSyncServerPlugin {
  async onMessageStored(message: StoredMessage) {
    // Custom logic when a message is stored
    console.log(`New message stored for ${message.recipient}`);
    
    // Call the parent implementation
    await super.onMessageStored(message);
  }
  
  async onMessageDelivered(message: StoredMessage) {
    // Custom logic when a message is delivered
    console.log(`Message ${message.id} delivered to ${message.recipient}`);
    
    // Call the parent implementation
    await super.onMessageDelivered(message);
  }
}

// Usage
const offlineSync = new CustomOfflineSync({
  messageTTL: 3 * 24 * 60 * 60 * 1000 // 3 days
});

await server.addPlugin(offlineSync);
```

## Monitoring and Maintenance

### Metrics

The plugin exposes the following metrics:

- `offline_sync_messages_total`: Total number of messages processed
- `offline_sync_messages_pending`: Number of pending messages
- `offline_sync_messages_delivered`: Number of delivered messages
- `offline_sync_messages_expired`: Number of expired messages
- `offline_sync_messages_failed`: Number of failed message deliveries
- `offline_sync_storage_size_bytes`: Total size of stored messages

### Cleanup

Expired messages are automatically cleaned up based on the `cleanupInterval` option. You can also trigger a manual cleanup:

```typescript
await offlineSync.cleanupExpiredMessages();
```

## Scaling Considerations

For high-traffic deployments:

1. **Database Backend**: Consider using a distributed database backend
2. **Sharding**: Shard messages by recipient DID for better distribution
3. **Caching**: Implement caching for frequently accessed messages
4. **Load Balancing**: Distribute load across multiple server instances

## Example: Distributed Deployment

```typescript
import { createServer } from '@cinderlink/server';
import { OfflineSyncServerPlugin } from '@cinderlink/plugin-offline-sync-server';
import Redis from 'ioredis';

// Create a Redis client for distributed caching
const redis = new Redis(process.env.REDIS_URL);

const server = await createServer({
  // Server configuration
});

const offlineSync = new OfflineSyncServerPlugin({
  messageTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxMessagesPerRecipient: 1000,
  // Custom storage implementation
  storage: {
    async getMessages(recipientDid, options = {}) {
      const key = `offline:${recipientDid}`;
      const messages = await redis.lrange(key, options.offset || 0, (options.limit || 100) - 1);
      return messages.map(msg => JSON.parse(msg));
    },
    async storeMessage(message) {
      const key = `offline:${message.recipient}`;
      await redis.lpush(key, JSON.stringify(message));
      // Set expiration on the key
      await redis.expire(key, Math.ceil(message.expiresAt / 1000) - Math.floor(Date.now() / 1000));
    },
    // Implement other required methods...
  }
});

await server.addPlugin(offlineSync);
await server.start();
```

## Contributing

Contributions are welcome! Please ensure all code follows the project's coding standards and includes appropriate tests.
