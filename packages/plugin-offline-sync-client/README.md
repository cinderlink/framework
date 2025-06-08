# @cinderlink/plugin-offline-sync-client

Client plugin for offline message synchronization in Cinderlink applications.

## Overview

This plugin enables Cinderlink clients to send and receive messages even when the intended recipient is offline. It works in conjunction with an offline sync server to store messages until they can be delivered.

## Features

- **Offline Messaging**: Send messages to offline recipients
- **Message Queue**: Queue messages when offline and send when connected
- **Automatic Retry**: Automatically retry failed message deliveries
- **Message Status Tracking**: Track the status of sent messages
- **Encryption**: End-to-end encryption for message privacy

## Installation

```bash
npm install @cinderlink/plugin-offline-sync-client
# or
yarn add @cinderlink/plugin-offline-sync-client
```

## Quick Start

### Basic Setup

```typescript
import { createClient } from '@cinderlink/client';
import { OfflineSyncClientPlugin } from '@cinderlink/plugin-offline-sync-client';

const client = await createClient({
  // Client configuration
});

// Add the offline sync client plugin
const offlineSync = new OfflineSyncClientPlugin({
  // Configuration options
  serverPeerId: '12D3KooW...', // Peer ID of the offline sync server
  retryInterval: 30000, // 30 seconds between retry attempts
  maxRetries: 5, // Maximum number of retry attempts
  encryptionKey: '...' // Optional encryption key
});

await client.addPlugin(offlineSync);

// Start the client
await client.start();
```

### Sending Messages

```typescript
// Send a message to an offline recipient
const messageId = await offlineSync.sendMessage({
  to: 'did:key:z6Mk...', // Recipient's DID
  topic: 'chat/message', // Message topic
  payload: { text: 'Hello, world!' } // Message payload
});

// Track message status
offlineSync.on('message:status', ({ id, status }) => {
  console.log(`Message ${id} status: ${status}`);
});
```

### Receiving Messages

```typescript
// Listen for incoming messages
offlineSync.on('message:received', async ({ id, from, topic, payload, timestamp }) => {
  console.log(`Received message from ${from} on ${topic}:`, payload);
  
  // Acknowledge receipt
  await offlineSync.acknowledgeMessage(id);
});
```

## Configuration Options

### `OfflineSyncClientOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serverPeerId` | `string` | **Required** | Peer ID of the offline sync server |
| `retryInterval` | `number` | `30000` (30s) | Interval between delivery retry attempts in milliseconds |
| `maxRetries` | `number` | `5` | Maximum number of retry attempts before giving up |
| `encryptionKey` | `string` | Auto-generated | Encryption key for message payloads |
| `autoAcknowledge` | `boolean` | `true` | Automatically acknowledge received messages |
| `queueOffline` | `boolean` | `true` | Queue messages when offline |

## API Reference

### `OfflineSyncClientPlugin`

#### `constructor(options: OfflineSyncClientOptions)`

Create a new offline sync client plugin.

#### `sendMessage(message: OutgoingMessage): Promise<string>`

Send a message to an offline recipient.

```typescript
const messageId = await offlineSync.sendMessage({
  to: 'did:key:z6Mk...',
  topic: 'chat/message',
  payload: { text: 'Hello, world!' },
  ttl: 86400000 // Optional time-to-live in milliseconds (default: 7 days)
});
```

#### `acknowledgeMessage(messageId: string): Promise<void>`

Acknowledge receipt of a message.

#### `getMessageStatus(messageId: string): Promise<MessageStatus>`

Get the status of a message.

#### `getPendingMessages(): Promise<Message[]>`

Get all pending outgoing messages.

#### `getQueuedMessages(): Promise<Message[]>`

Get all queued messages (waiting to be sent).

### Events

#### `message:queued`
Emitted when a message is queued for delivery.

#### `message:sent`
Emitted when a message is successfully sent to the server.

#### `message:delivered`
Emitted when a message is delivered to the recipient.

#### `message:failed`
Emitted when a message delivery fails.

#### `message:received`
Emitted when a new message is received.

#### `message:status`
Emitted when a message status changes.

## Message Flow

1. **Sending a Message**:
   ```typescript
   const messageId = await offlineSync.sendMessage({
     to: 'did:key:z6Mk...',
     topic: 'chat/message',
     payload: { text: 'Hello!' }
   });
   ```

2. **Message Queued**:
   - If offline, the message is stored locally
   - If online, the message is sent to the offline sync server

3. **Message Delivery**:
   - The offline sync server stores the message
   - When the recipient comes online, they fetch pending messages
   - The server delivers the message to the recipient

4. **Acknowledgment**:
   - The recipient acknowledges receipt of the message
   - The server updates the message status
   - The sender is notified of the delivery status

## Security Considerations

### Encryption

All message payloads are encrypted using the provided `encryptionKey`. It's recommended to:

1. Use a strong, unique encryption key
2. Rotate the key periodically
3. Never hardcode the key in your application

### Message Privacy

- Message metadata (sender, recipient, timestamp) is not encrypted
- Only the message payload is encrypted
- Consider using additional encryption for sensitive metadata

### Rate Limiting

Implement rate limiting to prevent abuse of the offline sync service.

## Example: Chat Application

Here's how to implement a simple chat application with offline support:

```typescript
import { createClient } from '@cinderlink/client';
import { OfflineSyncClientPlugin } from '@cinderlink/plugin-offline-sync-client';

class ChatApp {
  private offlineSync: OfflineSyncClientPlugin;
  
  constructor(private client: CinderlinkClientInterface) {
    this.offlineSync = new OfflineSyncClientPlugin({
      serverPeerId: '12D3KooW...',
      encryptionKey: this.getEncryptionKey()
    });
    
    this.setupEventListeners();
  }
  
  async initialize() {
    await this.client.addPlugin(this.offlineSync);
    await this.client.start();
  }
  
  private setupEventListeners() {
    // Handle incoming messages
    this.offlineSync.on('message:received', this.handleIncomingMessage.bind(this));
    
    // Track message status
    this.offlineSync.on('message:status', ({ id, status }) => {
      console.log(`Message ${id} status: ${status}`);
    });
  }
  
  private async handleIncomingMessage({ id, from, payload }: Message) {
    console.log(`New message from ${from}:`, payload);
    
    // Process the message...
    
    // Acknowledge receipt
    await this.offlineSync.acknowledgeMessage(id);
  }
  
  async sendChatMessage(recipientDid: string, text: string) {
    return this.offlineSync.sendMessage({
      to: recipientDid,
      topic: 'chat/message',
      payload: { 
        text,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  private getEncryptionKey(): string {
    // In a real app, retrieve this from secure storage
    return localStorage.getItem('chatEncryptionKey') || 
      this.generateAndStoreKey();
  }
  
  private generateAndStoreKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    localStorage.setItem('chatEncryptionKey', key);
    return key;
  }
}

// Usage
const client = await createClient({ /* config */ });
const chatApp = new ChatApp(client);
await chatApp.initialize();

// Send a message
await chatApp.sendChatMessage('did:key:z6Mk...', 'Hello, world!');
```

## Error Handling

Handle potential errors when sending messages:

```typescript
try {
  const messageId = await offlineSync.sendMessage({
    to: 'did:key:z6Mk...',
    topic: 'chat/message',
    payload: { text: 'Hello!' }
  });
  
  console.log('Message sent with ID:', messageId);
} catch (error) {
  console.error('Failed to send message:', error);
  
  if (error.code === 'OFFLINE') {
    console.log('Message queued for delivery when online');
  } else if (error.code === 'MAX_RETRIES_EXCEEDED') {
    console.error('Max retries exceeded. Message delivery failed.');
  }
}
```

## Contributing

Contributions are welcome! Please ensure all code follows the project's coding standards and includes appropriate tests.
