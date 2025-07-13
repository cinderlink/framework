# Tutorial 05: Building Your First Plugin

In this tutorial, we'll create a custom notification plugin for Cinderlink that allows applications to send and receive real-time notifications between peers.

## Prerequisites

- Completed [Tutorial 01: Getting Started](./01-getting-started.md)
- Basic understanding of TypeScript and async/await
- Familiarity with Zod for schema validation

## What We'll Build

We'll create a notification plugin that:
- Sends notifications between peers
- Stores notification history
- Supports different notification types (info, warning, error)
- Provides read/unread status tracking
- Emits events for UI updates

## Setting Up the Project

Create a new directory for our plugin:

```bash
mkdir cinderlink-plugin-notifications
cd cinderlink-plugin-notifications
bun init -y
```

Install dependencies:

```bash
bun add @cinderlink/core-types zod
bun add -d typescript @types/node
```

## Step 1: Define the Schema

Create `src/schema.ts` to define our notification data structure:

```typescript
import { z } from 'zod';

// Notification type enum
export const NotificationType = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
} as const;

// Core notification schema
export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['info', 'warning', 'error', 'success']),
  title: z.string().min(1).max(100),
  message: z.string().max(500),
  from: z.string(), // DID of sender
  to: z.string(),   // DID of recipient
  timestamp: z.number(),
  read: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional()
});

// Event schemas for P2P communication
export const sendNotificationSchema = z.object({
  type: z.literal('notification:send'),
  data: notificationSchema
});

export const acknowledgeSchema = z.object({
  type: z.literal('notification:acknowledge'),
  data: z.object({
    notificationId: z.string().uuid(),
    timestamp: z.number()
  })
});

// Event schemas for local events
export const notificationReceivedSchema = z.object({
  type: z.literal('notification:received'),
  data: notificationSchema
});

export const notificationReadSchema = z.object({
  type: z.literal('notification:read'),
  data: z.object({
    notificationId: z.string().uuid()
  })
});

// Create discriminated union for all events
export const eventSchema = z.discriminatedUnion('type', [
  sendNotificationSchema,
  acknowledgeSchema,
  notificationReceivedSchema,
  notificationReadSchema
]);

// Type exports
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationEvent = z.infer<typeof eventSchema>;
```

## Step 2: Create the Plugin Base

Create `src/plugin.ts`:

```typescript
import { z } from 'zod';
import { ZodPluginBase } from '@cinderlink/core-types';
import type { 
  CinderlinkClientInterface, 
  TypedIncomingMessage, 
  EventPayloadType 
} from '@cinderlink/core-types';
import { 
  eventSchema, 
  notificationSchema, 
  Notification,
  NotificationType 
} from './schema';

export class NotificationPlugin extends ZodPluginBase<typeof eventSchema> {
  name = 'notification-plugin';
  version = '1.0.0';
  
  // In-memory storage (in production, use persistent storage)
  private notifications: Map<string, Notification> = new Map();
  private unreadCount: number = 0;
  
  constructor(client: CinderlinkClientInterface) {
    super(client, eventSchema);
  }
  
  protected getEventHandlers() {
    return {
      'notification:send': this.handleIncomingNotification.bind(this),
      'notification:acknowledge': this.handleAcknowledgement.bind(this),
      'notification:received': this.handleNotificationReceived.bind(this),
      'notification:read': this.handleNotificationRead.bind(this)
    };
  }
  
  // Handler for incoming notifications from other peers
  private async handleIncomingNotification(
    message: TypedIncomingMessage<EventPayloadType<typeof eventSchema, 'notification:send'>>
  ) {
    const notification = message.payload.data;
    
    // Validate the notification is for us
    if (notification.to !== this.client.did.id) {
      this.logger.warn('Received notification for different recipient');
      return;
    }
    
    // Store the notification
    this.notifications.set(notification.id, notification);
    if (!notification.read) {
      this.unreadCount++;
    }
    
    // Emit local event for UI updates
    this.emit('notification:received', { 
      type: 'notification:received', 
      data: notification 
    });
    
    // Send acknowledgement back to sender
    if (message.from) {
      await this.client.sendMessage(message.from, {
        type: 'notification:acknowledge',
        data: {
          notificationId: notification.id,
          timestamp: Date.now()
        }
      });
    }
    
    this.logger.info(`Received notification: ${notification.title}`);
  }
  
  // Handler for acknowledgements
  private handleAcknowledgement(
    message: TypedIncomingMessage<EventPayloadType<typeof eventSchema, 'notification:acknowledge'>>
  ) {
    const { notificationId, timestamp } = message.payload.data;
    this.logger.debug(`Notification ${notificationId} acknowledged at ${timestamp}`);
    
    // Could update delivery status in a production system
  }
  
  // Handler for local notification received events
  private handleNotificationReceived(
    message: TypedIncomingMessage<EventPayloadType<typeof eventSchema, 'notification:received'>>
  ) {
    // This is for local event handling, UI components would listen to this
    this.logger.debug('Local notification event triggered');
  }
  
  // Handler for marking notifications as read
  private handleNotificationRead(
    message: TypedIncomingMessage<EventPayloadType<typeof eventSchema, 'notification:read'>>
  ) {
    const { notificationId } = message.payload.data;
    const notification = this.notifications.get(notificationId);
    
    if (notification && !notification.read) {
      notification.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.notifications.set(notificationId, notification);
      
      this.logger.debug(`Notification ${notificationId} marked as read`);
    }
  }
  
  // Public API Methods
  
  /**
   * Send a notification to another peer
   */
  async sendNotification(
    to: string,
    title: string,
    message: string,
    type: keyof typeof NotificationType = 'INFO',
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type: type.toLowerCase() as 'info' | 'warning' | 'error' | 'success',
      title,
      message,
      from: this.client.did.id,
      to,
      timestamp: Date.now(),
      read: false,
      metadata
    };
    
    // Validate the notification
    const validated = notificationSchema.parse(notification);
    
    // Send to peer
    await this.client.sendMessage(to, {
      type: 'notification:send',
      data: validated
    });
    
    this.logger.info(`Sent notification to ${to}: ${title}`);
    return notification.id;
  }
  
  /**
   * Get all notifications
   */
  getNotifications(options?: {
    unreadOnly?: boolean;
    type?: keyof typeof NotificationType;
    limit?: number;
    offset?: number;
  }): Notification[] {
    let notifications = Array.from(this.notifications.values());
    
    // Apply filters
    if (options?.unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    
    if (options?.type) {
      const typeFilter = options.type.toLowerCase();
      notifications = notifications.filter(n => n.type === typeFilter);
    }
    
    // Sort by timestamp (newest first)
    notifications.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    if (options?.offset) {
      notifications = notifications.slice(options.offset);
    }
    
    if (options?.limit) {
      notifications = notifications.slice(0, options.limit);
    }
    
    return notifications;
  }
  
  /**
   * Get a specific notification
   */
  getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }
  
  /**
   * Mark a notification as read
   */
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;
    
    if (!notification.read) {
      // Emit the read event
      this.emit('notification:read', {
        type: 'notification:read',
        data: { notificationId }
      });
    }
    
    return true;
  }
  
  /**
   * Mark all notifications as read
   */
  markAllAsRead(): number {
    let count = 0;
    for (const [id, notification] of this.notifications) {
      if (!notification.read) {
        this.markAsRead(id);
        count++;
      }
    }
    return count;
  }
  
  /**
   * Delete a notification
   */
  deleteNotification(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    if (!notification.read) {
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }
    
    return this.notifications.delete(id);
  }
  
  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications.clear();
    this.unreadCount = 0;
  }
  
  /**
   * Get unread notification count
   */
  getUnreadCount(): number {
    return this.unreadCount;
  }
  
  /**
   * Subscribe to notification events
   */
  onNotification(callback: (notification: Notification) => void): () => void {
    const handler = (event: any) => {
      if (event.type === 'notification:received') {
        callback(event.data);
      }
    };
    
    this.client.on('plugin:event', handler);
    
    // Return unsubscribe function
    return () => {
      this.client.off('plugin:event', handler);
    };
  }
}

// Export a factory function for easy instantiation
export function createNotificationPlugin(client: CinderlinkClientInterface): NotificationPlugin {
  return new NotificationPlugin(client);
}
```

## Step 3: Create Usage Example

Create `src/example.ts` to demonstrate how to use the plugin:

```typescript
import { createClient, createIdentityFromSeed } from '@cinderlink/client';
import { createNotificationPlugin, NotificationType } from './index';

async function main() {
  // Create two clients to demonstrate peer-to-peer notifications
  const client1 = await createClient({
    // ... client config
  });
  
  const client2 = await createClient({
    // ... client config
  });
  
  // Add notification plugin to both clients
  const notificationPlugin1 = createNotificationPlugin(client1);
  const notificationPlugin2 = createNotificationPlugin(client2);
  
  await client1.addPlugin(notificationPlugin1);
  await client2.addPlugin(notificationPlugin2);
  
  // Start both clients
  await client1.start();
  await client2.start();
  
  // Subscribe to notifications on client2
  const unsubscribe = notificationPlugin2.onNotification((notification) => {
    console.log('New notification received:');
    console.log(`From: ${notification.from}`);
    console.log(`Title: ${notification.title}`);
    console.log(`Message: ${notification.message}`);
    console.log(`Type: ${notification.type}`);
  });
  
  // Send notifications from client1 to client2
  await notificationPlugin1.sendNotification(
    client2.did.id,
    'Welcome!',
    'Welcome to the Cinderlink notification system',
    'INFO'
  );
  
  await notificationPlugin1.sendNotification(
    client2.did.id,
    'Low Storage',
    'Your IPFS storage is running low',
    'WARNING',
    { storageUsed: '85%' }
  );
  
  // Check notifications on client2
  setTimeout(() => {
    const notifications = notificationPlugin2.getNotifications();
    console.log(`\nClient2 has ${notifications.length} notifications`);
    console.log(`Unread count: ${notificationPlugin2.getUnreadCount()}`);
    
    // Mark first notification as read
    if (notifications.length > 0) {
      notificationPlugin2.markAsRead(notifications[0].id);
      console.log(`Marked notification as read. New unread count: ${notificationPlugin2.getUnreadCount()}`);
    }
    
    // Clean up
    unsubscribe();
    client1.stop();
    client2.stop();
  }, 2000);
}

main().catch(console.error);
```

## Step 4: Add Tests

Create `src/plugin.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationPlugin } from './plugin';
import { notificationSchema } from './schema';

describe('NotificationPlugin', () => {
  let mockClient: any;
  let plugin: NotificationPlugin;
  
  beforeEach(() => {
    mockClient = {
      did: { id: 'did:key:test123' },
      sendMessage: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn()
      }
    };
    
    plugin = new NotificationPlugin(mockClient);
  });
  
  describe('sendNotification', () => {
    it('should send a valid notification', async () => {
      const to = 'did:key:recipient123';
      const title = 'Test Notification';
      const message = 'This is a test';
      
      const notificationId = await plugin.sendNotification(to, title, message);
      
      expect(mockClient.sendMessage).toHaveBeenCalledWith(to, {
        type: 'notification:send',
        data: expect.objectContaining({
          id: notificationId,
          type: 'info',
          title,
          message,
          from: mockClient.did.id,
          to,
          read: false
        })
      });
    });
    
    it('should validate notification data', async () => {
      const to = 'did:key:recipient123';
      const title = ''; // Invalid: empty title
      const message = 'This is a test';
      
      await expect(
        plugin.sendNotification(to, title, message)
      ).rejects.toThrow();
    });
  });
  
  describe('notification management', () => {
    it('should track unread count correctly', () => {
      // Simulate receiving notifications
      const notification1 = {
        id: '123',
        type: 'info' as const,
        title: 'Test 1',
        message: 'Message 1',
        from: 'did:key:sender',
        to: mockClient.did.id,
        timestamp: Date.now(),
        read: false
      };
      
      // Manually add notification to test storage
      plugin['notifications'].set(notification1.id, notification1);
      plugin['unreadCount'] = 1;
      
      expect(plugin.getUnreadCount()).toBe(1);
      
      // Mark as read
      plugin.markAsRead(notification1.id);
      expect(plugin.getUnreadCount()).toBe(0);
    });
    
    it('should filter notifications correctly', () => {
      // Add test notifications
      const notifications = [
        {
          id: '1',
          type: 'info' as const,
          title: 'Info',
          message: 'Info message',
          from: 'did:key:sender',
          to: mockClient.did.id,
          timestamp: Date.now() - 1000,
          read: false
        },
        {
          id: '2',
          type: 'warning' as const,
          title: 'Warning',
          message: 'Warning message',
          from: 'did:key:sender',
          to: mockClient.did.id,
          timestamp: Date.now(),
          read: true
        }
      ];
      
      notifications.forEach(n => plugin['notifications'].set(n.id, n));
      plugin['unreadCount'] = 1;
      
      // Test unread filter
      const unreadOnly = plugin.getNotifications({ unreadOnly: true });
      expect(unreadOnly).toHaveLength(1);
      expect(unreadOnly[0].id).toBe('1');
      
      // Test type filter
      const warningOnly = plugin.getNotifications({ type: 'WARNING' });
      expect(warningOnly).toHaveLength(1);
      expect(warningOnly[0].id).toBe('2');
    });
  });
  
  describe('schema validation', () => {
    it('should validate notification schema', () => {
      const validNotification = {
        id: crypto.randomUUID(),
        type: 'info' as const,
        title: 'Valid Title',
        message: 'Valid message',
        from: 'did:key:sender',
        to: 'did:key:recipient',
        timestamp: Date.now(),
        read: false
      };
      
      expect(() => notificationSchema.parse(validNotification)).not.toThrow();
    });
    
    it('should reject invalid notification types', () => {
      const invalidNotification = {
        id: crypto.randomUUID(),
        type: 'invalid-type', // Invalid type
        title: 'Title',
        message: 'Message',
        from: 'did:key:sender',
        to: 'did:key:recipient',
        timestamp: Date.now(),
        read: false
      };
      
      expect(() => notificationSchema.parse(invalidNotification)).toThrow();
    });
  });
});
```

## Step 5: Package Configuration

Create `package.json`:

```json
{
  "name": "@myorg/cinderlink-plugin-notifications",
  "version": "1.0.0",
  "description": "Notification plugin for Cinderlink",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "test:run": "vitest run",
    "dev": "tsc --watch"
  },
  "files": [
    "dist",
    "src"
  ],
  "dependencies": {
    "@cinderlink/core-types": "^0.0.3",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "peerDependencies": {
    "@cinderlink/client": "^0.0.3"
  }
}
```

Create `src/index.ts` to export everything:

```typescript
export * from './plugin';
export * from './schema';
```

## Using Your Plugin

Now you can use your notification plugin in any Cinderlink application:

```typescript
import { createClient } from '@cinderlink/client';
import { createNotificationPlugin } from '@myorg/cinderlink-plugin-notifications';

async function setupApp() {
  const client = await createClient({ /* config */ });
  
  // Add the notification plugin
  const notifications = createNotificationPlugin(client);
  await client.addPlugin(notifications);
  
  // Listen for notifications
  notifications.onNotification((notification) => {
    // Update UI with new notification
    showNotificationBanner(notification);
  });
  
  // Send notifications to peers
  await notifications.sendNotification(
    peerDid,
    'New Message',
    'You have received a new message',
    'INFO'
  );
  
  await client.start();
}
```

## Best Practices

1. **Type Safety**: Always use Zod schemas for validation
2. **Error Handling**: Implement proper error handling in all methods
3. **Resource Cleanup**: Clean up listeners and subscriptions
4. **Testing**: Write comprehensive tests for your plugin
5. **Documentation**: Document your plugin's API and events
6. **Versioning**: Use semantic versioning for your plugin

## Advanced Topics

### Persistence

In production, store notifications in IPLD database:

```typescript
// Add to plugin constructor
const notificationTableSchema = z.object({
  id: z.string(),
  ...notificationSchema.shape
});

this.client.registerSchema({
  name: 'notifications',
  version: 1,
  tables: [{
    name: 'notifications',
    schema: notificationTableSchema
  }]
});
```

### Rate Limiting

Prevent notification spam:

```typescript
private rateLimiter = new Map<string, number[]>();

private checkRateLimit(from: string): boolean {
  const now = Date.now();
  const timestamps = this.rateLimiter.get(from) || [];
  
  // Keep only timestamps from last minute
  const recentTimestamps = timestamps.filter(t => now - t < 60000);
  
  if (recentTimestamps.length >= 10) {
    return false; // Rate limit exceeded
  }
  
  recentTimestamps.push(now);
  this.rateLimiter.set(from, recentTimestamps);
  return true;
}
```

## Summary

You've successfully created a fully-featured notification plugin that:
- ✅ Uses type-safe Zod schemas
- ✅ Handles P2P communication
- ✅ Manages notification state
- ✅ Provides a clean API
- ✅ Includes comprehensive tests

## Next Steps

- Explore other [plugin examples](https://github.com/cinderlink/framework/tree/main/packages) in the repository
- Read the [Plugin Development Guide](../guides/plugin-development.md) for advanced patterns
- Join the community to share your plugins and get feedback