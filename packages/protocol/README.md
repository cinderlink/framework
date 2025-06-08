# @cinderlink/protocol

Core networking protocols for the Cinderlink P2P network.

## Overview

This package implements the core networking protocols that enable communication between Cinderlink nodes. It provides a plugin (`CinderlinkProtocolPlugin`) that extends the Cinderlink client with protocol handling capabilities.

## Features

- Standardized message encoding/decoding
- Protocol versioning support
- Keepalive mechanism for connection health
- Extensible protocol handler system
- Stream management for large data transfers

## Installation

```bash
npm install @cinderlink/protocol
# or
yarn add @cinderlink/protocol
```

## Usage

### Basic Setup

```typescript
import { createClient } from '@cinderlink/client';
import { CinderlinkProtocolPlugin } from '@cinderlink/protocol';

const client = await createClient({
  // Client configuration
});

// Add the protocol plugin
const protocol = new CinderlinkProtocolPlugin();
await client.addPlugin(protocol);

// Start the client
await client.start();
```

### Protocol Handlers

Register handlers for specific protocol messages:

```typescript
protocol.on('message', (message) => {
  if (message.topic === 'custom/topic') {
    console.log('Received message:', message.payload);
  }
});

// Send a message to a specific peer
await protocol.send(peerId, {
  topic: 'custom/topic',
  payload: { hello: 'world' },
  timestamp: Date.now()
});

// Publish to a pubsub topic
await protocol.publish('custom/topic', {
  message: 'Hello, network!'
});
```

## Message Format

All protocol messages follow this structure:

```typescript
interface ProtocolMessage {
  // Protocol version (e.g., '1.0.0')
  version: string;
  
  // Message ID (UUID v4)
  id: string;
  
  // Sender's PeerID
  from: string;
  
  // Optional recipient PeerID
  to?: string;
  
  // Message topic (e.g., 'chat/message', 'sync/request')
  topic: string;
  
  // Message payload (any JSON-serializable data)
  payload: unknown;
  
  // Message timestamp (milliseconds since epoch)
  timestamp: number;
  
  // Optional message TTL (in seconds)
  ttl?: number;
}
```

## Built-in Topics

### `/cinderlink/1.0.0`

Base protocol messages:

- `ping`: Keepalive ping
- `pong`: Keepalive pong response
- `error`: Error response

### `/cinderlink/keepalive`

Keepalive messages for connection health monitoring.

## Custom Protocols

Create custom protocol handlers by extending the base protocol:

```typescript
import { ProtocolHandler } from '@cinderlink/protocol';

class ChatProtocol extends ProtocolHandler {
  constructor() {
    super('chat', '1.0.0');
  }
  
  async handleMessage(message: ProtocolMessage) {
    if (message.topic === 'message') {
      console.log('Chat message:', message.payload);
    }
  }
  
  async sendMessage(peerId: string, content: string) {
    return this.send(peerId, {
      topic: 'message',
      payload: { content }
    });
  }
}

// Register the protocol
const chat = new ChatProtocol();
protocol.registerHandler(chat);

// Use the protocol
await chat.sendMessage(peerId, 'Hello!');
```

## Error Handling

Handle protocol errors:

```typescript
protocol.on('error', (error, message) => {
  console.error('Protocol error:', error);
  
  if (message) {
    console.error('Related message:', message);
  }
});
```

## Security Considerations

- Always validate message payloads
- Implement proper authentication and authorization
- Be cautious with message TTL to prevent replay attacks
- Use encryption for sensitive data

## Performance

- Batch messages when possible
- Use streaming for large data transfers
- Consider message size and frequency

## Contributing

Contributions are welcome! Please ensure all code follows the project's coding standards and includes appropriate tests.
