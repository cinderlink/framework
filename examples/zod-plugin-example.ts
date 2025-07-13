/**
 * Example: Creating a Simple Chat Plugin with Zod Validation
 * 
 * This example demonstrates how to create a type-safe plugin using
 * the Zod validation system in Cinderlink.
 */

import { z } from 'zod';
import { createZodPlugin, type CinderlinkClientInterface } from '@cinderlink/core-types';
import { createClient } from '@cinderlink/client';
import { createDID } from '@cinderlink/identifiers';

// Step 1: Define your event schemas using Zod
const chatSchemas = {
  // Messages we can send to other peers
  send: {
    '/chat/message': z.object({
      id: z.string().uuid(),
      text: z.string().min(1).max(1000),
      timestamp: z.number(),
      replyTo: z.string().uuid().optional()
    }),
    
    '/chat/typing': z.object({
      isTyping: z.boolean()
    }),
    
    '/chat/read': z.object({
      messageId: z.string().uuid(),
      timestamp: z.number()
    })
  },
  
  // Messages we can receive from other peers
  receive: {
    '/chat/message': z.object({
      id: z.string().uuid(),
      text: z.string().min(1).max(1000),
      timestamp: z.number(),
      replyTo: z.string().uuid().optional()
    }),
    
    '/chat/typing': z.object({
      isTyping: z.boolean()
    }),
    
    '/chat/read': z.object({
      messageId: z.string().uuid(),
      timestamp: z.number()
    })
  },
  
  // Topics we can publish to
  publish: {
    '/chat/room/join': z.object({
      roomId: z.string(),
      userId: z.string(),
      displayName: z.string()
    }),
    
    '/chat/room/leave': z.object({
      roomId: z.string(),
      userId: z.string()
    }),
    
    '/chat/room/message': z.object({
      roomId: z.string(),
      message: z.object({
        id: z.string().uuid(),
        text: z.string(),
        userId: z.string(),
        timestamp: z.number()
      })
    })
  },
  
  // Topics we can subscribe to
  subscribe: {
    '/chat/room/join': z.object({
      roomId: z.string(),
      userId: z.string(),
      displayName: z.string()
    }),
    
    '/chat/room/leave': z.object({
      roomId: z.string(),
      userId: z.string()
    }),
    
    '/chat/room/message': z.object({
      roomId: z.string(),
      message: z.object({
        id: z.string().uuid(),
        text: z.string(),
        userId: z.string(),
        timestamp: z.number()
      })
    })
  },
  
  // Internal events we can emit
  emit: {
    'chat:message:received': z.object({
      from: z.string(),
      message: z.object({
        id: z.string().uuid(),
        text: z.string(),
        timestamp: z.number()
      })
    }),
    
    'chat:user:typing': z.object({
      userId: z.string(),
      isTyping: z.boolean()
    }),
    
    'chat:error': z.object({
      code: z.enum(['SEND_FAILED', 'INVALID_MESSAGE', 'USER_BLOCKED']),
      message: z.string(),
      details: z.unknown().optional()
    })
  }
};

// Step 2: Create the plugin using createZodPlugin helper
const ChatPlugin = createZodPlugin('chat', chatSchemas, {
  // Plugin lifecycle
  async start(plugin) {
    plugin.logger.info('Chat plugin starting...');
    
    // Subscribe to room topics
    await plugin.client.subscribe('/chat/room/join');
    await plugin.client.subscribe('/chat/room/leave');
    await plugin.client.subscribe('/chat/room/message');
    
    plugin.logger.info('Chat plugin started');
  },
  
  async stop(plugin) {
    plugin.logger.info('Chat plugin stopping...');
    
    // Unsubscribe from topics
    await plugin.client.unsubscribe('/chat/room/join');
    await plugin.client.unsubscribe('/chat/room/leave');
    await plugin.client.unsubscribe('/chat/room/message');
    
    plugin.logger.info('Chat plugin stopped');
  },
  
  // Event handlers with automatic validation
  handlers: {
    // Handle direct messages from peers
    p2p: {
      '/chat/message': async (payload) => {
        // payload is automatically validated and typed!
        console.log(`Message from ${payload.peer.did}: ${payload.text}`);
        
        // Emit internal event
        plugin.emitValidated('chat:message:received', {
          from: payload.peer.did || payload.peer.peerId.toString(),
          message: {
            id: payload.id,
            text: payload.text,
            timestamp: payload.timestamp
          }
        });
        
        // Send read receipt
        await plugin.sendValidated(
          payload.peer.peerId.toString(),
          '/chat/read',
          {
            messageId: payload.id,
            timestamp: Date.now()
          }
        );
      },
      
      '/chat/typing': async (payload) => {
        plugin.emitValidated('chat:user:typing', {
          userId: payload.peer.did || payload.peer.peerId.toString(),
          isTyping: payload.isTyping
        });
      },
      
      '/chat/read': async (payload) => {
        console.log(`Message ${payload.messageId} read at ${new Date(payload.timestamp)}`);
      }
    },
    
    // Handle pubsub messages
    pubsub: {
      '/chat/room/join': async (payload) => {
        console.log(`${payload.displayName} joined room ${payload.roomId}`);
      },
      
      '/chat/room/leave': async (payload) => {
        console.log(`User ${payload.userId} left room ${payload.roomId}`);
      },
      
      '/chat/room/message': async (payload) => {
        console.log(`Room ${payload.roomId} message: ${payload.message.text}`);
      }
    }
  }
});

// Step 3: Create a chat client with the plugin
class ChatClient {
  private client: CinderlinkClientInterface;
  private chatPlugin: InstanceType<typeof ChatPlugin>;
  
  constructor(client: CinderlinkClientInterface) {
    this.client = client;
    this.chatPlugin = new ChatPlugin(client);
  }
  
  async start() {
    await this.client.addPlugin(this.chatPlugin);
    await this.client.start();
  }
  
  // Type-safe message sending
  async sendMessage(peerId: string, text: string, replyTo?: string) {
    const message = {
      id: crypto.randomUUID(),
      text,
      timestamp: Date.now(),
      replyTo
    };
    
    // The TypeScript compiler ensures the payload matches the schema!
    await this.chatPlugin.sendValidated(peerId, '/chat/message', message);
    
    return message;
  }
  
  // Type-safe room messaging
  async sendRoomMessage(roomId: string, text: string) {
    await this.chatPlugin.publishValidated('/chat/room/message', {
      roomId,
      message: {
        id: crypto.randomUUID(),
        text,
        userId: this.client.did.id,
        timestamp: Date.now()
      }
    });
  }
  
  // Join a chat room
  async joinRoom(roomId: string, displayName: string) {
    await this.chatPlugin.publishValidated('/chat/room/join', {
      roomId,
      userId: this.client.did.id,
      displayName
    });
  }
  
  // Listen for messages
  onMessage(callback: (from: string, message: any) => void) {
    this.client.pluginEvents.on('chat:message:received', callback);
  }
  
  // Listen for typing indicators
  onTyping(callback: (userId: string, isTyping: boolean) => void) {
    this.client.pluginEvents.on('chat:user:typing', callback);
  }
}

// Step 4: Example usage
async function main() {
  // Create identity
  const { did, address, addressVerification } = await createDID();
  
  // Create Cinderlink client
  const client = await createClient({
    did,
    address,
    addressVerification,
    role: 'peer',
    nodes: ['ws://localhost:4001'] // Connect to a Cinderlink server
  });
  
  // Create chat client
  const chat = new ChatClient(client);
  
  // Set up message handler
  chat.onMessage((from, message) => {
    console.log(`New message from ${from}: ${message.text}`);
  });
  
  // Start the client
  await chat.start();
  
  // Join a room
  await chat.joinRoom('general', 'Alice');
  
  // Send a room message
  await chat.sendRoomMessage('general', 'Hello everyone!');
  
  // Send a direct message to a peer
  const peerId = 'QmPeerId...'; // Get from peer discovery
  await chat.sendMessage(peerId, 'Hi there!');
}

// Run the example
if (import.meta.main) {
  main().catch(console.error);
}

/**
 * Benefits of Zod-based plugins:
 * 
 * 1. **Type Safety**: All event payloads are fully typed
 * 2. **Runtime Validation**: Invalid messages are automatically rejected
 * 3. **Schema as Documentation**: Schemas serve as API documentation
 * 4. **Error Messages**: Zod provides detailed validation error messages
 * 5. **Composability**: Schemas can be composed and extended
 * 6. **Testing**: Schemas can be tested independently
 * 
 * Example of validation in action:
 * 
 * // This would throw a validation error:
 * await chat.sendMessage(peerId, ''); // Empty text not allowed
 * 
 * // This would throw a validation error:
 * await chat.sendMessage(peerId, 'a'.repeat(1001)); // Text too long
 * 
 * // This would throw a validation error:
 * await chat.sendRoomMessage('room', 123); // Text must be string
 */