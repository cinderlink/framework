# @cinderlink/plugin-identity-server

Identity management server for the Cinderlink network.

## Overview

This plugin provides identity-related functionality for Cinderlink servers, including DID resolution, identity verification, and access control. It serves as a central point for managing identities and their associated data.

## Features

- **DID Resolution**: Resolve DIDs to their associated documents
- **Identity Verification**: Verify identity claims and signatures
- **Access Control**: Manage permissions for identities
- **Identity Linking**: Link multiple identities together
- **Revocation**: Revoke identity claims and permissions

## Installation

```bash
npm install @cinderlink/plugin-identity-server
# or
yarn add @cinderlink/plugin-identity-server
```

## Quick Start

### Server Setup

```typescript
import { createServer } from '@cinderlink/server';
import { IdentityServerPlugin } from '@cinderlink/plugin-identity-server';

const server = await createServer({
  // Server configuration
});

// Add the identity server plugin
const identityServer = new IdentityServerPlugin({
  // Configuration options
});

await server.addPlugin(identityServer);

// Start the server
await server.start();
```

### Client Usage

```typescript
import { createClient } from '@cinderlink/client';
import { IdentityClientPlugin } from '@cinderlink/plugin-identity-client';

const client = await createClient({
  // Client configuration
});

// Add the identity client plugin
const identityClient = new IdentityClientPlugin({
  // Configuration options
});

await client.addPlugin(identityClient);

// Start the client
await client.start();

// Register an identity
const identity = await identityClient.register({
  did: client.did,
  name: 'Alice',
  email: 'alice@example.com'
});

// Verify an identity
const verified = await identityClient.verify(identity.did);
console.log('Identity verified:', verified);
```

## API Reference

### `IdentityServerPlugin`

#### `constructor(options?: IdentityServerOptions)`

Create a new identity server plugin.

#### `register(identity: Identity): Promise<Identity>`

Register a new identity.

#### `resolve(did: string): Promise<IdentityDocument>`

Resolve a DID to its identity document.

#### `verify(did: string, proof: string): Promise<boolean>`

Verify an identity proof.

### `IdentityClientPlugin`

#### `constructor(options?: IdentityClientOptions)`

Create a new identity client plugin.

#### `register(identity: Partial<Identity>): Promise<Identity>`

Register a new identity.

#### `resolve(did: string): Promise<IdentityDocument>`

Resolve a DID to its identity document.

#### `verify(did: string): Promise<boolean>`

Verify an identity.

## Identity Management

### Creating Identities

```typescript
const identity = await identityClient.register({
  did: client.did,
  name: 'Alice',
  email: 'alice@example.com',
  publicKey: client.publicKey,
  metadata: {
    // Additional identity metadata
  }
});
```

### Verifying Identities

```typescript
const verified = await identityClient.verify(identity.did, proof);
if (verified) {
  console.log('Identity verified');
} else {
  console.log('Identity verification failed');
}
```

### Resolving Identities

```typescript
const identityDoc = await identityClient.resolve('did:key:z6Mk...');
console.log('Identity document:', identityDoc);
```

## Access Control

### Defining Permissions

```typescript
// Grant read access to a DID
await identityServer.grantAccess({
  did: 'did:key:z6Mk...',
  resource: 'my-resource',
  actions: ['read']
});

// Check permissions
const hasAccess = await identityServer.checkAccess({
  did: 'did:key:z6Mk...',
  resource: 'my-resource',
  action: 'read'
});
```

### Revoking Access

```typescript
await identityServer.revokeAccess({
  did: 'did:key:z6Mk...',
  resource: 'my-resource',
  actions: ['read']
});
```

## Identity Linking

### Linking Identities

```typescript
// Link two DIDs
await identityServer.linkIdentities({
  fromDid: 'did:key:z6Mk...',
  toDid: 'did:ethr:0x...',
  proof: '...' // Proof of ownership
});

// Get linked identities
const linked = await identityServer.getLinkedIdentities('did:key:z6Mk...');
```

## Security Considerations

- Always verify identity proofs before trusting an identity
- Use secure channels for sensitive operations
- Implement rate limiting to prevent abuse
- Regularly audit access permissions

## Example: User Profile Management

```typescript
// Define profile schema
const profileSchema = new Schema('profiles', {
  profiles: new Table<Profile>('profiles', {
    definition: {
      did: { type: 'did' },
      name: { type: 'string' },
      email: { type: 'string' },
      avatar: { type: 'string', optional: true },
      bio: { type: 'string', optional: true },
      updatedAt: { type: 'number' }
    },
    indexes: ['did']
  })
});

// Load the schema
await client.schema.load(profileSchema);

// Create a profile
const profile = await client.schema.getTable('profiles', 'profiles').insert({
  did: client.did,
  name: 'Alice',
  email: 'alice@example.com',
  bio: 'Blockchain enthusiast',
  updatedAt: Date.now()
});

// Update profile
await client.schema.getTable('profiles', 'profiles').update(
  { did: client.did },
  { bio: 'Blockchain developer', updatedAt: Date.now() }
);

// Get profile
const myProfile = await client.schema.getTable('profiles', 'profiles').get({
  did: client.did
});
```

## Contributing

Contributions are welcome! Please ensure all code follows the project's coding standards and includes appropriate tests.
