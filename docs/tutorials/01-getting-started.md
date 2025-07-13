# Getting Started with Cinderlink

Welcome to Cinderlink! This tutorial will get you up and running with the framework in just a few minutes.

## What You'll Build

In this tutorial, you'll create a simple peer-to-peer messaging application that demonstrates the core features of Cinderlink:
- **Decentralized identity** using DIDs
- **Peer-to-peer networking** with libp2p  
- **Data storage** with IPLD
- **Plugin architecture** for modularity

## Prerequisites

- **Node.js 16+** - [Download Node.js](https://nodejs.org/)
- **Bun** (recommended) or npm - [Install Bun](https://bun.sh/)
- **Basic TypeScript knowledge** - Cinderlink is built with TypeScript

## Installation

### 1. Create a New Project

```bash
mkdir my-cinderlink-app
cd my-cinderlink-app
npm init -y
```

### 2. Install Cinderlink

```bash
# Using bun (recommended)
bun add @cinderlink/client @cinderlink/identifiers @cinderlink/ipld-database

# Using npm
npm install @cinderlink/client @cinderlink/identifiers @cinderlink/ipld-database
```

### 3. Set Up TypeScript

```bash
# Install TypeScript dependencies
bun add -d typescript @types/node

# Create tsconfig.json
cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

## Your First Cinderlink Application

### 1. Create the Project Structure

```bash
mkdir src
touch src/index.ts
```

### 2. Basic Client Setup

Create `src/index.ts`:

```typescript
import { CinderlinkClient } from '@cinderlink/client';
import { IdentifierManager } from '@cinderlink/identifiers';

async function main() {
  console.log('🚀 Starting Cinderlink application...');
  
  // Step 1: Create a decentralized identity
  const identityManager = new IdentifierManager();
  const identity = await identityManager.create();
  
  console.log('✅ Created identity:', identity.did);
  
  // Step 2: Initialize the client
  const client = new CinderlinkClient({
    identity: identity,
    networking: {
      transports: ['websocket'],
      enableDHT: true
    }
  });
  
  // Step 3: Start the client
  await client.start();
  console.log('✅ Client started, peer ID:', client.peerId.toString());
  
  // Step 4: Set up event handlers
  client.on('/peer/connected', (peer) => {
    console.log('🤝 Peer connected:', peer.peerId.toString());
  });
  
  client.on('/peer/disconnected', (peer) => {
    console.log('👋 Peer disconnected:', peer.peerId.toString());
  });
  
  // Keep the application running
  console.log('🔄 Application running... Press Ctrl+C to exit');
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await client.stop();
    process.exit(0);
  });
}

// Handle errors
main().catch((error) => {
  console.error('❌ Application error:', error);
  process.exit(1);
});
```

### 3. Run Your Application

```bash
# Using bun
bun run src/index.ts

# Using Node.js + tsx
npx tsx src/index.ts
```

You should see output like:
```
🚀 Starting Cinderlink application...
✅ Created identity: did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
✅ Client started, peer ID: 12D3KooWGBfKqBATM7r9nM9WJBpGhqN7YgUjdp3GhqN7YgUjdp3G
🔄 Application running... Press Ctrl+C to exit
```

**Congratulations!** 🎉 You've created your first Cinderlink application with:
- A decentralized identity (DID)
- A running P2P client
- Event handling for peer connections

## Adding Data Storage

Let's enhance the application with data storage capabilities.

### 1. Create a Data Schema

Update `src/index.ts` to include data storage:

```typescript
import { CinderlinkClient } from '@cinderlink/client';
import { IdentifierManager } from '@cinderlink/identifiers';
import { Schema } from '@cinderlink/ipld-database';
import type { TableRow, TableDefinition } from '@cinderlink/core-types';

// Define your data structure
interface Message extends TableRow {
  from: string;
  content: string;
  timestamp: number;
}

// Define the table schema
const MessageTableDef: TableDefinition<Message> = {
  schemaId: 'messages',
  schemaVersion: 1,
  encrypted: false,
  aggregate: {},
  indexes: {
    timestamp: {
      unique: false,
      fields: ['timestamp']
    },
    from: {
      unique: false,
      fields: ['from']
    }
  },
  rollup: 1000,
  searchOptions: {
    fields: ['content', 'from']
  }
};

async function main() {
  console.log('🚀 Starting Cinderlink application...');
  
  // Create identity and client (same as before)
  const identityManager = new IdentifierManager();
  const identity = await identityManager.create();
  console.log('✅ Created identity:', identity.did);
  
  const client = new CinderlinkClient({
    identity: identity,
    networking: {
      transports: ['websocket'],
      enableDHT: true
    }
  });
  
  await client.start();
  console.log('✅ Client started, peer ID:', client.peerId.toString());
  
  // Create and add schema
  const schema = new Schema(
    'my-app',
    { messages: MessageTableDef },
    client.dag,
    client.logger.module('db')
  );
  
  client.addSchema('my-app', schema);
  
  // Get the messages table
  const messagesTable = schema.getTable<Message>('messages');
  
  console.log('✅ Database schema created');
  
  // Add a welcome message
  await messagesTable.insert({
    from: identity.did,
    content: 'Hello, Cinderlink!',
    timestamp: Date.now()
  });
  
  console.log('✅ Welcome message stored');
  
  // Query and display messages
  const messages = await messagesTable.query()
    .orderBy('timestamp', 'desc')
    .select()
    .execute();
    
  console.log('📝 Stored messages:');
  messages.all().forEach(msg => {
    const date = new Date(msg.timestamp).toLocaleTimeString();
    console.log(`  [${date}] ${msg.from.slice(-8)}: ${msg.content}`);
  });
  
  // Set up peer event handlers
  client.on('/peer/connected', (peer) => {
    console.log('🤝 Peer connected:', peer.peerId.toString());
  });
  
  console.log('🔄 Application running... Press Ctrl+C to exit');
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await client.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Application error:', error);
  process.exit(1);
});
```

### 2. Run the Enhanced Application

```bash
bun run src/index.ts
```

You should see output like:
```
🚀 Starting Cinderlink application...
✅ Created identity: did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
✅ Client started, peer ID: 12D3KooWGBfKqBATM7r9nM9WJBpGhqN7YgUjdp3GhqN7YgUjdp3G
✅ Database schema created
✅ Welcome message stored
📝 Stored messages:
  [10:30:45 AM] aXgBZDvo: Hello, Cinderlink!
🔄 Application running... Press Ctrl+C to exit
```

## Adding Peer Communication

Now let's add the ability to send and receive messages between peers.

### 1. Enhanced Messaging Application

Replace the content of `src/index.ts` with this enhanced version:

```typescript
import { CinderlinkClient } from '@cinderlink/client';
import { IdentifierManager } from '@cinderlink/identifiers';
import { Schema } from '@cinderlink/ipld-database';
import type { 
  TableRow, 
  TableDefinition, 
  IncomingP2PMessage,
  PluginEventDef 
} from '@cinderlink/core-types';
import * as readline from 'readline';

// Define message structure
interface Message extends TableRow {
  from: string;
  content: string;
  timestamp: number;
}

// Define app events
interface AppEvents extends PluginEventDef {
  send: {
    '/my-app/message': { content: string; timestamp: number };
  };
  receive: {
    '/my-app/message': { content: string; timestamp: number };
  };
}

const MessageTableDef: TableDefinition<Message> = {
  schemaId: 'messages',
  schemaVersion: 1,
  encrypted: false,
  aggregate: {},
  indexes: {
    timestamp: { unique: false, fields: ['timestamp'] }
  },
  rollup: 1000,
  searchOptions: { fields: ['content', 'from'] }
};

async function main() {
  console.log('🚀 Starting Cinderlink messaging app...');
  
  // Create identity and client
  const identityManager = new IdentifierManager();
  const identity = await identityManager.create();
  const shortId = identity.did.slice(-8);
  
  console.log(`✅ Created identity: ${shortId}`);
  
  const client = new CinderlinkClient({
    identity: identity,
    networking: {
      transports: ['websocket'],
      enableDHT: true
    }
  });
  
  await client.start();
  console.log(`✅ Client started, peer ID: ${client.peerId.toString().slice(-8)}`);
  
  // Set up database
  const schema = new Schema(
    'my-app',
    { messages: MessageTableDef },
    client.dag,
    client.logger.module('db')
  );
  
  client.addSchema('my-app', schema);
  const messagesTable = schema.getTable<Message>('messages');
  
  // Handle incoming messages
  client.on('/my-app/message', async (message: IncomingP2PMessage<AppEvents, '/my-app/message'>) => {
    const senderShortId = message.peer.did?.slice(-8) || 'unknown';
    
    // Store the message
    await messagesTable.insert({
      from: message.peer.did || 'unknown',
      content: message.payload.content,
      timestamp: message.payload.timestamp
    });
    
    // Display the message
    const time = new Date(message.payload.timestamp).toLocaleTimeString();
    console.log(`\n💬 [${time}] ${senderShortId}: ${message.payload.content}`);
    console.log('Type a message (or "quit" to exit):');
  });
  
  // Handle peer connections
  client.on('/peer/connected', (peer) => {
    const peerShortId = peer.peerId.toString().slice(-8);
    console.log(`🤝 Peer connected: ${peerShortId}`);
  });
  
  client.on('/peer/disconnected', (peer) => {
    const peerShortId = peer.peerId.toString().slice(-8);
    console.log(`👋 Peer disconnected: ${peerShortId}`);
  });
  
  // Set up command line interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n📱 Messaging app ready!');
  console.log('Commands:');
  console.log('  - Type a message to broadcast to all peers');
  console.log('  - Type "history" to view message history');
  console.log('  - Type "peers" to view connected peers');
  console.log('  - Type "quit" to exit');
  console.log('\nType a message (or "quit" to exit):');
  
  rl.on('line', async (input) => {
    const message = input.trim();
    
    if (message === 'quit') {
      console.log('👋 Goodbye!');
      rl.close();
      await client.stop();
      process.exit(0);
    } else if (message === 'history') {
      const messages = await messagesTable.query()
        .orderBy('timestamp', 'desc')
        .limit(10)
        .select()
        .execute();
        
      console.log('\n📝 Recent messages:');
      messages.all().reverse().forEach(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        const fromShortId = msg.from.slice(-8);
        console.log(`  [${time}] ${fromShortId}: ${msg.content}`);
      });
      console.log('\nType a message (or "quit" to exit):');
    } else if (message === 'peers') {
      const peers = client.peers.getAllPeers();
      console.log(`\n👥 Connected peers (${peers.length}):`);
      peers.forEach(peer => {
        const peerShortId = peer.peerId.toString().slice(-8);
        console.log(`  - ${peerShortId}`);
      });
      console.log('\nType a message (or "quit" to exit):');
    } else if (message) {
      // Broadcast message to all connected peers
      const timestamp = Date.now();
      const peers = client.peers.getAllPeers();
      
      if (peers.length === 0) {
        console.log('❌ No connected peers to send message to');
      } else {
        for (const peer of peers) {
          await client.send(peer.peerId.toString(), {
            topic: '/my-app/message',
            payload: { content: message, timestamp }
          });
        }
        
        // Store our own message
        await messagesTable.insert({
          from: identity.did,
          content: message,
          timestamp
        });
        
        console.log(`✅ Message sent to ${peers.length} peer(s)`);
      }
      console.log('Type a message (or "quit" to exit):');
    }
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    rl.close();
    await client.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Application error:', error);
  process.exit(1);
});
```

### 2. Test Peer-to-Peer Messaging

```bash
# Terminal 1
bun run src/index.ts

# Terminal 2 (in another terminal window)
bun run src/index.ts
```

You should see both applications start up and potentially discover each other. Try typing messages in one terminal and see them appear in the other!

## Creating Your First Plugin (Optional)

Let's create a simple plugin using the new Zod-based validation system. This demonstrates how to build type-safe, validated plugins.

### 1. Install Zod

```bash
bun add zod
```

### 2. Create a Simple Echo Plugin

Create a new file `src/echo-plugin.ts`:

```typescript
import { z } from 'zod';
import { createZodPlugin } from '@cinderlink/core-types';

// Define the event schemas for your plugin
const echoSchemas = {
  // Messages we can send
  send: {
    '/echo/message': z.object({
      text: z.string().min(1).max(100),
      timestamp: z.number()
    }),
    '/echo/reply': z.object({
      originalText: z.string(),
      echoedText: z.string(),
      timestamp: z.number()
    })
  },
  
  // Messages we can receive
  receive: {
    '/echo/message': z.object({
      text: z.string().min(1).max(100),
      timestamp: z.number()
    }),
    '/echo/reply': z.object({
      originalText: z.string(),
      echoedText: z.string(),
      timestamp: z.number()
    })
  }
};

// Create the plugin using createZodPlugin
export const EchoPlugin = createZodPlugin('echo', echoSchemas, {
  // Plugin lifecycle
  async start(plugin) {
    plugin.logger.info('Echo plugin started!');
  },
  
  // Event handlers with automatic validation
  handlers: {
    p2p: {
      // Handle incoming echo messages
      '/echo/message': async (payload) => {
        // payload is automatically validated and typed!
        console.log(`📨 Received echo request: "${payload.text}"`);
        
        // Send echo reply back
        await plugin.sendValidated(
          payload.peer.peerId.toString(),
          '/echo/reply',
          {
            originalText: payload.text,
            echoedText: `ECHO: ${payload.text}`,
            timestamp: Date.now()
          }
        );
      },
      
      // Handle echo replies
      '/echo/reply': async (payload) => {
        console.log(`📬 Received echo reply: "${payload.echoedText}"`);
      }
    }
  }
});
```

### 3. Use the Plugin in Your Application

Update your `src/index.ts` to include the echo plugin:

```typescript
// Add this import at the top
import { EchoPlugin } from './echo-plugin';

// In your main function, after creating the client:
async function main() {
  // ... existing code ...

  // Add the echo plugin
  const echoPlugin = new EchoPlugin(client);
  await client.addPlugin(echoPlugin);
  
  // ... rest of your code ...
  
  // Add echo command to your message handler
  rl.on('line', async (input) => {
    const message = input.trim();
    
    if (message.startsWith('echo ')) {
      // Send echo message to all connected peers
      const textToEcho = message.slice(5);
      const peers = client.peers.all();
      
      for (const peer of peers) {
        if (peer.connected && peer.peerId) {
          await echoPlugin.sendValidated(
            peer.peerId.toString(),
            '/echo/message',
            {
              text: textToEcho,
              timestamp: Date.now()
            }
          );
          console.log(`🔊 Sent echo request to ${peer.peerId.toString().slice(-8)}`);
        }
      }
    }
    // ... rest of your message handling ...
  });
}
```

### 4. Try It Out

1. Start two instances of your application
2. Type `echo Hello World!` in one terminal
3. Watch as the other instance receives the message and sends back an echo!

The beauty of Zod-based plugins is that:
- **Type Safety**: TypeScript knows exactly what fields are in your messages
- **Runtime Validation**: Invalid messages are automatically rejected
- **Better Errors**: Zod provides clear error messages when validation fails
- **Less Code**: No manual validation needed!

## What You've Learned

Congratulations! 🎉 You've successfully:

1. **✅ Created a decentralized identity** using DIDs
2. **✅ Set up peer-to-peer networking** with libp2p
3. **✅ Implemented data storage** with IPLD and schemas
4. **✅ Built peer-to-peer messaging** between clients
5. **✅ Created a type-safe plugin** with Zod validation
6. **✅ Used TypeScript types** for compile-time and runtime safety

## Next Steps

Now that you have the basics down, explore more advanced features:

### **Immediate Next Steps**
1. **[Create Your First App](./02-creating-your-first-app.md)** - Build a more complex application
2. **[Identity Management](./03-identity-management.md)** - Learn about DID and wallet integration
3. **[Data Storage](./04-data-storage.md)** - Advanced IPLD database usage

### **Advanced Topics**
1. **[Plugin Development](./05-plugin-development.md)** - Create reusable plugins
2. **[Deployment](./06-deployment.md)** - Deploy your application
3. **[Performance Optimization](../guides/performance/optimization.md)** - Optimize your app

### **Reference Materials**
1. **[API Documentation](../api/)** - Complete API reference
2. **[Core Concepts](../guides/architecture/core-concepts.md)** - Deep dive into architecture
3. **[Troubleshooting](./07-troubleshooting.md)** - Common issues and solutions

## Getting Help

If you run into issues:

- **📖 Check the [troubleshooting guide](./07-troubleshooting.md)**
- **💬 Join our [community discussions](https://github.com/cinderlink/framework/discussions)**
- **🐛 Report bugs on [GitHub Issues](https://github.com/cinderlink/framework/issues)**
- **📚 Browse the [complete documentation](../README.md)**

Welcome to the Cinderlink community! 🚀