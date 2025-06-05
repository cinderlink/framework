# @cinderlink/plugin-social-server

Server-side component for Cinderlink social features, handling data persistence, verification, and discovery.

## Features

- **User Verification**: Verifies user identity through blockchain signatures
- **Data Persistence**: Stores and serves social data
- **Discovery**: Enables user and content discovery
- **Pinning**: Supports pinning of important content
- **Synchronization**: Participates in the social data sync network

## Installation

```bash
npm install @cinderlink/plugin-social-server
```

## Usage

```typescript
import { SocialServerPlugin } from '@cinderlink/plugin-social-server';
import { createServer } from '@cinderlink/server';

const server = await createServer({
  // ... server config
  plugins: [
    // ... other plugins
    [SocialServerPlugin, {
      // Plugin options
    }],
  ],
});

await server.start();
```

## API

### P2P Handlers

- `"/social/users/announce"`: Handle user announcements with address verification
- `"/social/users/search/request"`: Handle user search requests
- `"/social/users/get/request"`: Handle user profile requests
- `"/social/users/pin/request"`: Handle user pinning requests (server-to-server)

### PubSub Handlers

- `"/social/users/announce"`: Handle public user announcements
- `"/social/posts/create"`: (Stub) Handle post creation
- `"/social/connections/create"`: (Stub) Handle connection creation

## Configuration

```typescript
{
  // Enable/disable address verification (default: true)
  verifyAddresses: true,
  
  // Maximum number of search results to return (default: 50)
  maxSearchResults: 50,
  
  // Cache TTL in milliseconds (default: 300000)
  cacheTTL: 300000
}
```

## Data Model

The server uses the schema defined in `@cinderlink/plugin-social-core` and extends it with server-specific tables:

### Server Metadata

```typescript
{
  key: string;           // Metadata key
  value: any;            // Metadata value
  updatedAt: string;     // ISO timestamp
}
```

### User Pins

```typescript
{
  did: string;           // User's DID
  targetDid: string;     // Pinned user's DID
  metadata?: any;        // Additional pin data
  createdAt: string;     // ISO timestamp
}
```

## Security Considerations

- All P2P messages are signed and verified
- Address verification prevents impersonation
- Rate limiting is applied to prevent abuse
- Sensitive operations require server authentication

## Dependencies

- @cinderlink/plugin-social-core
- @cinderlink/plugin-sync-db
- @cinderlink/identifiers

## License

MIT
