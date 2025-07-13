# Plugin Development Guide

This guide covers how to develop plugins for the Cinderlink framework, including the new Zod-based validation system for type-safe plugin development.

## Table of Contents

1. [Overview](#overview)
2. [Basic Plugin Structure](#basic-plugin-structure)
3. [Zod-Based Plugins](#zod-based-plugins)
4. [Event Types](#event-types)
5. [Plugin Lifecycle](#plugin-lifecycle)
6. [Best Practices](#best-practices)
7. [Examples](#examples)

## Overview

Plugins in Cinderlink extend the framework's functionality by:
- Handling network events (P2P messages, pubsub topics)
- Managing data schemas and synchronization
- Providing domain-specific features (social, identity, etc.)
- Integrating with external services

## Basic Plugin Structure

Every plugin must implement the `PluginInterface`:

```typescript
interface PluginInterface {
  id: string;                    // Unique plugin identifier
  started: boolean;              // Plugin state
  logger: SubLoggerInterface;    // Plugin-specific logger
  
  // Event handlers
  p2p?: Record<string, PluginEventHandler>;      // P2P message handlers
  pubsub?: Record<string, PluginEventHandler>;   // Pubsub topic handlers
  coreEvents?: Record<string, PluginEventHandler>; // Core system event handlers
  pluginEvents?: Record<string, PluginEventHandler>; // Custom plugin event handlers
  
  // Lifecycle methods
  start?(): Promise<void>;
  stop?(): Promise<void>;
}
```

## Zod-Based Plugins

The Zod-based plugin system provides automatic validation and type inference for all plugin events.

### Defining Event Schemas

First, define your event schemas using Zod:

```typescript
import { z } from 'zod';

const eventSchemas = {
  // P2P messages this plugin can send
  send: {
    '/myplugin/request': z.object({
      requestId: z.string(),
      data: z.string(),
      timestamp: z.number()
    }),
    '/myplugin/response': z.object({
      requestId: z.string(),
      result: z.string(),
      success: z.boolean()
    })
  },
  
  // P2P messages this plugin can receive
  receive: {
    '/myplugin/request': z.object({
      requestId: z.string(),
      data: z.string(),
      timestamp: z.number()
    }),
    '/myplugin/response': z.object({
      requestId: z.string(),
      result: z.string(),
      success: z.boolean()
    })
  },
  
  // Pubsub topics this plugin can publish to
  publish: {
    '/myplugin/announce': z.object({
      nodeId: z.string(),
      capabilities: z.array(z.string()),
      timestamp: z.number()
    })
  },
  
  // Pubsub topics this plugin can subscribe to
  subscribe: {
    '/myplugin/announce': z.object({
      nodeId: z.string(),
      capabilities: z.array(z.string()),
      timestamp: z.number()
    })
  },
  
  // Custom events this plugin can emit
  emit: {
    'myplugin:ready': z.object({
      version: z.string(),
      features: z.array(z.string())
    }),
    'myplugin:error': z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional()
    })
  }
};
```

### Creating a Zod Plugin

Use the `createZodPlugin` helper to create a type-safe plugin:

```typescript
import { createZodPlugin } from '@cinderlink/core-types';

const MyPlugin = createZodPlugin('myplugin', eventSchemas, {
  // Plugin implementation
  async start(plugin) {
    plugin.logger.info('Starting MyPlugin');
    
    // Subscribe to pubsub topics
    await plugin.client.subscribe('/myplugin/announce');
    
    // Emit ready event with validation
    plugin.emitValidated('myplugin:ready', {
      version: '1.0.0',
      features: ['feature1', 'feature2']
    });
  },
  
  async stop(plugin) {
    plugin.logger.info('Stopping MyPlugin');
    await plugin.client.unsubscribe('/myplugin/announce');
  },
  
  // Event handlers with automatic validation
  handlers: {
    p2p: {
      '/myplugin/request': async (payload) => {
        // payload is automatically validated and typed
        console.log('Received request:', payload.requestId);
        
        // Send response (also validated)
        await plugin.sendValidated(
          payload.peer.peerId.toString(),
          '/myplugin/response',
          {
            requestId: payload.requestId,
            result: 'Processed successfully',
            success: true
          }
        );
      }
    },
    
    pubsub: {
      '/myplugin/announce': async (payload) => {
        // payload is validated against the subscribe schema
        console.log('Node announced:', payload.nodeId);
      }
    }
  }
});
```

### Using the Plugin

```typescript
import { createClient } from '@cinderlink/client';

const client = await createClient({
  did,
  address,
  addressVerification,
  role: 'peer'
});

// Add the plugin
const myPlugin = new MyPlugin(client);
await client.addPlugin(myPlugin);

// Start the client (which starts all plugins)
await client.start();
```

## Event Types

### P2P Events (send/receive)

Direct messages between specific peers:
- Used for requests/responses
- Private communication
- Requires peer connection

### Pubsub Events (publish/subscribe)

Broadcast messages to all subscribers:
- Used for announcements
- Public communication
- No direct peer connection required

### Plugin Events (emit)

Internal events within the application:
- Used for plugin state changes
- Local to the client instance
- Useful for inter-plugin communication

## Plugin Lifecycle

1. **Construction**: Plugin is instantiated with a client reference
2. **Registration**: Plugin is added to client via `addPlugin()`
3. **Start**: Plugin's `start()` method is called when client starts
4. **Running**: Plugin handles events and performs its functions
5. **Stop**: Plugin's `stop()` method is called when client stops

## Best Practices

### 1. Schema Design

- Keep schemas focused and minimal
- Use optional fields for backwards compatibility
- Version your schemas when making breaking changes
- Document schema fields clearly

### 2. Error Handling

```typescript
handlers: {
  p2p: {
    '/myplugin/request': async (payload) => {
      try {
        // Process request
        const result = await processRequest(payload.data);
        
        // Send success response
        await plugin.sendValidated(peer, '/myplugin/response', {
          requestId: payload.requestId,
          result,
          success: true
        });
      } catch (error) {
        // Send error response
        await plugin.sendValidated(peer, '/myplugin/response', {
          requestId: payload.requestId,
          result: error.message,
          success: false
        });
        
        // Emit error event
        plugin.emitValidated('myplugin:error', {
          code: 'PROCESS_ERROR',
          message: error.message
        });
      }
    }
  }
}
```

### 3. Resource Management

- Clean up subscriptions in `stop()`
- Cancel timers and intervals
- Close database connections
- Unregister event handlers

### 4. Testing

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('MyPlugin schemas', () => {
  it('validates request schema', () => {
    const schema = eventSchemas.send['/myplugin/request'];
    
    // Valid payload
    expect(() => schema.parse({
      requestId: '123',
      data: 'test',
      timestamp: Date.now()
    })).not.toThrow();
    
    // Invalid payload
    expect(() => schema.parse({
      requestId: 123, // wrong type
      data: 'test',
      timestamp: Date.now()
    })).toThrow();
  });
});
```

## Examples

### Simple Echo Plugin

```typescript
const echoSchemas = {
  send: {
    '/echo/message': z.object({
      text: z.string(),
      echo: z.boolean().optional()
    })
  },
  receive: {
    '/echo/message': z.object({
      text: z.string(),
      echo: z.boolean().optional()
    })
  }
};

const EchoPlugin = createZodPlugin('echo', echoSchemas, {
  handlers: {
    p2p: {
      '/echo/message': async (payload) => {
        if (!payload.echo) {
          // Echo back to sender
          await plugin.sendValidated(
            payload.peer.peerId.toString(),
            '/echo/message',
            {
              text: `Echo: ${payload.text}`,
              echo: true
            }
          );
        }
      }
    }
  }
});
```

### Database Sync Plugin

```typescript
const syncSchemas = {
  send: {
    '/sync/request': z.object({
      table: z.string(),
      since: z.number(),
      limit: z.number().optional()
    }),
    '/sync/data': z.object({
      table: z.string(),
      rows: z.array(z.record(z.unknown())),
      hasMore: z.boolean()
    })
  },
  receive: {
    '/sync/request': z.object({
      table: z.string(),
      since: z.number(),
      limit: z.number().optional()
    }),
    '/sync/data': z.object({
      table: z.string(),
      rows: z.array(z.record(z.unknown())),
      hasMore: z.boolean()
    })
  },
  emit: {
    'sync:started': z.object({
      table: z.string(),
      peer: z.string()
    }),
    'sync:completed': z.object({
      table: z.string(),
      peer: z.string(),
      rowsReceived: z.number()
    })
  }
};

const SyncPlugin = createZodPlugin('sync', syncSchemas, {
  async start(plugin) {
    // Initialize sync state
    this.syncState = new Map();
  },
  
  handlers: {
    p2p: {
      '/sync/request': async (payload) => {
        const { table, since, limit = 100 } = payload;
        
        // Get rows from database
        const rows = await plugin.client.getSchema(table)
          .query()
          .where('updatedAt', '>', since)
          .limit(limit)
          .all();
        
        // Send data back
        await plugin.sendValidated(
          payload.peer.peerId.toString(),
          '/sync/data',
          {
            table,
            rows,
            hasMore: rows.length === limit
          }
        );
      },
      
      '/sync/data': async (payload) => {
        const { table, rows } = payload;
        
        // Emit sync started event
        plugin.emitValidated('sync:started', {
          table,
          peer: payload.peer.peerId.toString()
        });
        
        // Store received rows
        const schema = plugin.client.getSchema(table);
        for (const row of rows) {
          await schema.upsert(row);
        }
        
        // Emit sync completed event
        plugin.emitValidated('sync:completed', {
          table,
          peer: payload.peer.peerId.toString(),
          rowsReceived: rows.length
        });
      }
    }
  }
});
```

## Advanced Topics

### Custom Validation

Add custom validation logic to schemas:

```typescript
const userSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  age: z.number().int().min(13).max(120),
  role: z.enum(['user', 'admin', 'moderator']),
  metadata: z.record(z.string(), z.unknown()).optional()
}).refine(
  (data) => {
    // Custom validation: admins must be 18+
    if (data.role === 'admin' && data.age < 18) {
      return false;
    }
    return true;
  },
  { message: 'Admins must be 18 or older' }
);
```

### Schema Composition

Reuse schemas across events:

```typescript
// Base schemas
const userProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatar: z.string().url().optional()
});

const timestampSchema = z.object({
  createdAt: z.number(),
  updatedAt: z.number()
});

// Composed schemas
const eventSchemas = {
  send: {
    '/social/profile/update': userProfileSchema.merge(timestampSchema),
    '/social/profile/get': z.object({
      userId: z.string()
    })
  },
  receive: {
    '/social/profile/response': userProfileSchema.merge(timestampSchema).extend({
      found: z.boolean()
    })
  }
};
```

### Type Inference

Get TypeScript types from schemas:

```typescript
// Infer types from schemas
type MyPluginEvents = InferEventTypes<typeof eventSchemas>;

// Use inferred types
type RequestPayload = MyPluginEvents['send']['/myplugin/request'];
type AnnouncePayload = MyPluginEvents['subscribe']['/myplugin/announce'];

// Types are automatically available in handlers
const handleRequest = (payload: RequestPayload) => {
  // payload.requestId is typed as string
  // payload.data is typed as string
  // payload.timestamp is typed as number
};
```

## Migration Guide

To migrate existing plugins to use Zod validation:

1. Define schemas for all events
2. Replace manual validation with schema validation
3. Update handlers to use validated types
4. Test with invalid payloads to ensure validation works

Before:
```typescript
class MyPlugin implements PluginInterface {
  p2p = {
    '/myplugin/request': async (payload: any) => {
      // Manual validation
      if (!payload.requestId || typeof payload.requestId !== 'string') {
        throw new Error('Invalid requestId');
      }
      // ... handle request
    }
  };
}
```

After:
```typescript
const MyPlugin = createZodPlugin('myplugin', schemas, {
  handlers: {
    p2p: {
      '/myplugin/request': async (payload) => {
        // Validation is automatic!
        // payload is fully typed
        // ... handle request
      }
    }
  }
});
```