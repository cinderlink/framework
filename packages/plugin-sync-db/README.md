# @cinderlink/plugin-sync-db

Database synchronization plugin for Cinderlink, enabling real-time data sync between peers.

## Overview

This plugin provides a robust mechanism for synchronizing IPLD database tables between Cinderlink peers. It handles conflict resolution, change tracking, and efficient data transfer to keep databases in sync across the network.

## Features

- **Real-time Synchronization**: Keep database tables in sync across peers
- **Conflict Resolution**: Configurable conflict resolution strategies
- **Selective Sync**: Control which tables and rows are synchronized
- **Efficient Updates**: Only sync changes to minimize network traffic
- **Access Control**: Fine-grained permissions for table access

## Installation

```bash
npm install @cinderlink/plugin-sync-db
# or
yarn add @cinderlink/plugin-sync-db
```

## Quick Start

### Basic Setup

```typescript
import { createClient } from '@cinderlink/client';
import { SyncDBPlugin } from '@cinderlink/plugin-sync-db';

const client = await createClient({
  // Client configuration
});

// Add the sync-db plugin
const syncDB = new SyncDBPlugin();
await client.addPlugin(syncDB);

// Start the client
await client.start();
```

### Syncing a Table

```typescript
// Define a schema with sync configuration
const schema = new Schema('my-app', {
  todos: new Table<Todo>('todos', {
    definition: {
      id: { type: 'string' },
      title: { type: 'string' },
      completed: { type: 'boolean' },
      owner: { type: 'did' } // Reference to the owner's DID
    },
    // Sync configuration
    sync: {
      // Sync strategy: 'all', 'owner', or 'custom'
      strategy: 'owner',
      // Function to determine if a row should be synced with a peer
      allowSync: (row, peerId) => {
        // Only sync todos owned by the current user
        return row.owner === client.did;
      },
      // Function to determine if a peer can write to this table
      canWrite: (peerId) => {
        // Only allow the owner to write
        return peerId === client.peerId;
      }
    }
  })
});

// Load the schema
await client.schema.load(schema);

// Enable sync for this schema
await syncDB.enableSync('my-app');
```

## Sync Configuration

### Sync Strategies

- `'all'`: Sync all rows with all peers
- `'owner'`: Only sync rows where the current peer is the owner
- `'custom'`: Use the `allowSync` function to determine sync behavior

### Advanced Configuration

```typescript
const syncConfig = {
  // Sync strategy
  strategy: 'custom',
  
  // Custom sync function
  allowSync: (row, peerId) => {
    // Return true to sync this row with the peer
    return true;
  },
  
  // Write permissions
  canWrite: (peerId) => {
    // Return true to allow writes from this peer
    return true;
  },
  
  // Conflict resolution strategy
  resolveConflict: (local, remote, localVersion, remoteVersion) => {
    // Return the winning version
    return remoteVersion > localVersion ? remote : local;
  },
  
  // Batch size for sync operations
  batchSize: 100,
  
  // Sync interval in milliseconds
  syncInterval: 5000,
  
  // Maximum number of retries for failed syncs
  maxRetries: 3
};
```

## API Reference

### `SyncDBPlugin`

#### `enableSync(schemaId: string, config?: SyncConfig): Promise<void>`

Enable synchronization for a schema.

#### `disableSync(schemaId: string): Promise<void>`

Disable synchronization for a schema.

#### `syncWithPeer(peerId: string, schemaId?: string): Promise<void>`

Trigger a manual sync with a specific peer.

#### `getSyncStatus(peerId?: string): SyncStatus`

Get the current sync status.

### Events

#### `sync:start`
Emitted when a sync operation starts.

#### `sync:complete`
Emitted when a sync operation completes.

#### `sync:error`
Emitted when a sync operation encounters an error.

#### `sync:conflict`
Emitted when a conflict is detected.

## Conflict Resolution

By default, the plugin uses a "last write wins" strategy for conflict resolution. You can customize this by providing a `resolveConflict` function in your sync configuration.

```typescript
const syncConfig = {
  strategy: 'custom',
  resolveConflict: (local, remote, localVersion, remoteVersion) => {
    // Custom conflict resolution logic
    if (local.updatedAt > remote.updatedAt) {
      return local;
    } else {
      return remote;
    }
  }
};
```

## Performance Considerations

- Use appropriate batch sizes to balance memory usage and network efficiency
- Consider indexing frequently queried fields
- Be mindful of the sync interval in high-traffic applications
- Monitor sync performance and adjust configuration as needed

## Security

- Always validate and sanitize data before syncing
- Implement proper access control using the `canWrite` function
- Encrypt sensitive data before syncing
- Be cautious when syncing with untrusted peers

## Example: Todo App

```typescript
// Define the Todo type
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  owner: string; // DID of the owner
  createdAt: number;
  updatedAt: number;
}

// Create a schema for todos
const todoSchema = new Schema('todos', {
  todos: new Table<Todo>('todos', {
    definition: {
      id: { type: 'string' },
      title: { type: 'string' },
      completed: { type: 'boolean' },
      owner: { type: 'did' },
      createdAt: { type: 'number' },
      updatedAt: { type: 'number' }
    },
    sync: {
      strategy: 'owner',
      canWrite: (peerId, row) => {
        // Only allow the owner to modify their todos
        return row.owner === client.did;
      }
    }
  })
});

// Load the schema
await client.schema.load(todoSchema);

// Enable sync
await syncDB.enableSync('todos');

// Add a new todo
const todo = await client.schema.getTable('todos', 'todos').insert({
  id: uuidv4(),
  title: 'Buy groceries',
  completed: false,
  owner: client.did,
  createdAt: Date.now(),
  updatedAt: Date.now()
});

// Listen for changes
client.on('document:insert', (table, doc) => {
  if (table === 'todos') {
    console.log('New todo:', doc);
  }
});
```

## Contributing

Contributions are welcome! Please ensure all code follows the project's coding standards and includes appropriate tests.
