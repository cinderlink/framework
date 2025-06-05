# @cinderlink/plugin-social-core

Core shared definitions for Cinderlink social features, including IPLD schemas and synchronization configurations.

## Overview

This package provides the foundational data structures and synchronization rules used by `@cinderlink/plugin-social-client` and `@cinderlink/plugin-social-server`. It defines the data model for social features and how data is synchronized across the network.

## Installation

```bash
npm install @cinderlink/plugin-social-core
```

## Schema Definition

The social schema defines the following tables:

### Users

```typescript
{
  did: string;           // User's DID
  name?: string;          // Display name
  address: string;        // Blockchain address
  addressVerification: string; // Signature of address verification
  metadata?: any;         // Additional user metadata
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}
```

### Profiles

```typescript
{
  did: string;           // User's DID
  displayName?: string;   // Display name
  avatar?: string;        // URL to avatar image
  bio?: string;           // User biography
  location?: string;      // User location
  website?: string;       // Personal website
  metadata?: any;         // Additional profile data
  updatedAt: string;      // ISO timestamp
}
```

### Posts

```typescript
{
  id: string;            // Unique post ID
  author: string;         // Author's DID
  content: string;        // Post content
  media?: string[];       // Array of media CIDs
  tags?: string[];        // Hashtags or categories
  mentions?: string[];     // Array of mentioned DIDs
  parentId?: string;      // For replies
  metadata?: any;         // Additional post data
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}
```

### Connections

```typescript
{
  from: string;          // Follower's DID
  to: string;             // Followed user's DID
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}
```

## Synchronization Configuration

The `SocialSyncConfig` defines how data is synchronized across the network:

```typescript
{
  // Table-specific sync configurations
  users: {
    // Sync with the network every 30 seconds
    syncInterval: 30000,
    // Only the user can update their own record
    allowUpdateFrom: (row, peerId) => row.did === peerId,
    // Anyone can fetch user data
    allowFetchRowFrom: () => true,
  },
  // Similar configurations for other tables...
}
```

## Usage

### Loading the Schema

```typescript
import { loadSocialSchema, SocialSyncConfig } from '@cinderlink/plugin-social-core';

// In your plugin:
async start() {
  const schema = await loadSocialSchema();
  // Use the schema with your database
}
```

### Using Sync Configuration

```typescript
import { SocialSyncConfig } from '@cinderlink/plugin-social-core';

// In your plugin:
const syncConfig = {
  ...SocialSyncConfig,
  // Override specific sync behaviors if needed
  posts: {
    ...SocialSyncConfig.posts,
    syncInterval: 60000, // Sync posts less frequently
  },
};
```

## Data Ownership and Privacy

- **Users** own their data and control access through the sync configuration
- Sensitive data is encrypted at rest and in transit
- Users can define custom privacy settings through the sync rules

## Dependencies

- @cinderlink/ipld-database
- @cinderlink/identifiers

## License

MIT
