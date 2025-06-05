# @cinderlink/plugin-social-client

Client-side social networking features for the Cinderlink framework, including user profiles, posts, follows/connections, chat, and notifications.

## Features

- **User Profiles**: Manage user profiles and discover other users
- **Posts**: Create, read, and interact with social posts
- **Connections**: Follow/unfollow other users and manage connections
- **Chat**: Real-time messaging with other users
- **Notifications**: Receive and manage social notifications
- **Settings**: User preferences and privacy settings

## Installation

```bash
npm install @cinderlink/plugin-social-client
```

## Usage

```typescript
import { SocialClientPlugin } from '@cinderlink/plugin-social-client';
import { createClient } from '@cinderlink/client';

const client = await createClient({
  // ... client config
  plugins: [
    // ... other plugins
    [SocialClientPlugin, {
      // Plugin options
    }],
  ],
});

await client.start();
```

## API

### SocialClientPlugin

Main plugin class that orchestrates social features.

#### Methods

- `getUser(did: string)`: Get a user by DID
- `createPost(content: string, options?: PostOptions)`: Create a new post
- `followUser(targetDid: string)`: Follow another user
- `unfollowUser(targetDid: string)`: Unfollow a user
- `sendMessage(recipientDid: string, content: string)`: Send a direct message
- `searchUsers(query: string, options?: SearchOptions)`: Search for users

## Configuration

```typescript
{
  // Enable/disable auto-sync with social servers (default: true)
  autoSync: true,
  
  // Sync interval in milliseconds (default: 30000)
  syncInterval: 30000,
  
  // Maximum number of messages to keep in memory (default: 1000)
  maxMessages: 1000
}
```

## Events

The plugin emits various events that can be listened to:

```typescript
client.on('social/post/created', (post) => {
  console.log('New post:', post);
});

client.on('social/message/received', (message) => {
  console.log('New message:', message);
});

// Other events:
// - social/user/updated
// - social/connection/created
// - social/notification/received
```

## Dependencies

- @cinderlink/plugin-social-core
- @cinderlink/plugin-sync-db

## License

MIT
