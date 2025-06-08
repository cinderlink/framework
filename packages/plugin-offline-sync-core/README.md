# @cinderlink/plugin-offline-sync-core

Core components and types for offline message synchronization in Cinderlink.

## Overview

This package provides the foundational types, interfaces, and utilities for implementing offline message synchronization in the Cinderlink ecosystem. It's designed to be used by both client and server implementations of the offline sync feature.

## Features

- Defines the core IPLD schema for offline messages
- Provides TypeScript types and interfaces for offline sync
- Includes utility functions for working with offline messages
- Ensures consistent message structure across implementations

## Installation

```bash
npm install @cinderlink/plugin-offline-sync-core
# or
yarn add @cinderlink/plugin-offline-sync-core
```

## Core Concepts

### Message Flow

1. **Message Creation**: A sender creates a message for an offline recipient
2. **Storage**: The message is stored by an offline sync server
3. **Retrieval**: The recipient retrieves stored messages when they come online
4. **Acknowledgement**: The recipient acknowledges receipt of messages

### Message Schema

Offline messages are stored using the following IPLD schema:

```typescript
interface OfflineMessage {
  id: string; // Unique message ID (UUID v4)
  sender: string; // Sender's DID
  recipient: string; // Recipient's DID
  payload: string; // Encrypted message payload
  payloadCid: string; // CID of the encrypted payload (if stored separately)
  createdAt: number; // Timestamp in milliseconds
  expiresAt?: number; // Optional expiration timestamp
  status: 'pending' | 'delivered' | 'failed';
  attempts: number; // Number of delivery attempts
  lastAttemptAt?: number; // Timestamp of last delivery attempt
  error?: string; // Last error message (if any)
}
```

## Usage

### Loading the Schema

```typescript
import { loadOfflineSyncSchema } from '@cinderlink/plugin-offline-sync-core';

// Load the offline sync schema into a Cinderlink client
const schema = loadOfflineSyncSchema();
await client.schema.load(schema);

// Get the messages table
const messages = client.schema.getTable('offlineSync', 'messages');
```

### Creating a Message

```typescript
import { v4 as uuidv4 } from 'uuid';
import { OfflineMessage } from '@cinderlink/plugin-offline-sync-core';

const message: OfflineMessage = {
  id: uuidv4(),
  sender: client.did,
  recipient: 'did:key:z6Mk...',
  payload: '...encrypted message...',
  payloadCid: 'bafy...',
  createdAt: Date.now(),
  status: 'pending',
  attempts: 0
};

// Store the message
await messages.upsert({ id: message.id }, message);
```

### Retrieving Messages

```typescript
// Get all pending messages for the current user
const pendingMessages = await messages.query({
  where: {
    recipient: client.did,
    status: 'pending'
  },
  orderBy: {
    createdAt: 'asc'
  }
});

// Process each message
for (const message of pendingMessages) {
  try {
    // Process the message...
    
    // Update status to delivered
    await messages.update(
      { id: message.id },
      { 
        status: 'delivered',
        lastAttemptAt: Date.now()
      }
    );
  } catch (error) {
    // Update status to failed
    await messages.update(
      { id: message.id },
      { 
        status: 'failed',
        lastAttemptAt: Date.now(),
        attempts: message.attempts + 1,
        error: error.message
      }
    );
  }
}
```

## Security Considerations

### Message Encryption

This package does not handle message encryption. It's the responsibility of the application to encrypt message payloads before storing them. We recommend using a strong encryption algorithm like AES-256-GCM with a unique key per message.

### Message Expiration

Consider setting an `expiresAt` timestamp for messages to prevent indefinite storage of undeliverable messages.

### Rate Limiting

Implement rate limiting to prevent abuse of the offline sync service.

## API Reference

### `loadOfflineSyncSchema(): Schema`

Loads the offline sync schema definition.

### Types

#### `OfflineMessage`

```typescript
interface OfflineMessage {
  id: string;
  sender: string;
  recipient: string;
  payload: string;
  payloadCid?: string;
  createdAt: number;
  expiresAt?: number;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt?: number;
  error?: string;
}
```

### Constants

#### `OFFLINE_SYNC_SCHEMA_ID = 'offlineSync'`

The schema ID used for offline sync.

#### `OFFLINE_MESSAGES_TABLE = 'messages'`

The table name used for storing offline messages.

## Example Implementation

Here's a complete example of how to implement an offline sync client:

```typescript
import { createClient } from '@cinderlink/client';
import { loadOfflineSyncSchema, OfflineMessage } from '@cinderlink/plugin-offline-sync-core';

class OfflineSyncClient {
  constructor(private client: CinderlinkClientInterface) {}
  
  async initialize() {
    // Load the offline sync schema
    const schema = loadOfflineSyncSchema();
    await this.client.schema.load(schema);
    
    // Listen for new messages
    this.client.on('document:insert', (table, doc) => {
      if (table === 'messages' && doc.recipient === this.client.did) {
        this.handleNewMessage(doc);
      }
    });
  }
  
  async sendMessage(recipientDid: string, payload: any) {
    // Encrypt the payload (implementation depends on your encryption strategy)
    const encryptedPayload = await this.encryptPayload(payload, recipientDid);
    
    // Optionally store the payload in IPFS
    const payloadCid = await this.client.ipfs.dag.put(encryptedPayload);
    
    // Create the message
    const message: OfflineMessage = {
      id: crypto.randomUUID(),
      sender: this.client.did,
      recipient: recipientDid,
      payload: JSON.stringify(encryptedPayload),
      payloadCid: payloadCid.toString(),
      createdAt: Date.now(),
      status: 'pending',
      attempts: 0
    };
    
    // Store the message
    const messages = this.client.schema.getTable('offlineSync', 'messages');
    await messages.upsert({ id: message.id }, message);
    
    return message.id;
  }
  
  private async handleNewMessage(message: OfflineMessage) {
    try {
      // Process the message...
      
      // Update status to delivered
      const messages = this.client.schema.getTable('offlineSync', 'messages');
      await messages.update(
        { id: message.id },
        { 
          status: 'delivered',
          lastAttemptAt: Date.now()
        }
      );
    } catch (error) {
      // Update status to failed
      const messages = this.client.schema.getTable('offlineSync', 'messages');
      await messages.update(
        { id: message.id },
        { 
          status: 'failed',
          lastAttemptAt: Date.now(),
          attempts: message.attempts + 1,
          error: error.message
        }
      );
    }
  }
  
  private async encryptPayload(payload: any, recipientDid: string): Promise<any> {
    // Implement your encryption logic here
    // This is a placeholder implementation
    return {
      encrypted: true,
      data: JSON.stringify(payload)
    };
  }
}
```

## Contributing

Contributions are welcome! Please ensure all code follows the project's coding standards and includes appropriate tests.
