# @cinderlink/ipld-database

IPLD-based database system for structured, schema-defined storage in Cinderlink applications.

## Overview

This package provides a powerful database system built on IPLD (InterPlanetary Linked Data) that enables structured, schema-defined storage with optional encryption. It's designed to work seamlessly with the Cinderlink client and supports complex data relationships through IPLD's content-addressable storage model.

## Features

- **Schema-based data modeling**: Define your data structures with TypeScript decorators
- **IPLD storage**: All data is stored in IPLD for content-addressability
- **Encryption support**: Optional JWE encryption at the schema level
- **Event-driven**: Emits events for all database operations
- **Query interface**: Powerful querying capabilities with filtering and sorting
- **DID integration**: Link data to DIDs for decentralized identity

## Installation

```bash
npm install @cinderlink/ipld-database
# or
yarn add @cinderlink/ipld-database
```

## Quick Start

### Define a Schema

```typescript
import { Schema, Table, field, link } from '@cinderlink/ipld-database';

class User {
  @field('string')
  name!: string;
  
  @field('string')
  email!: string;
  
  @field('number')
  age?: number;
}

class BlogPost {
  @field('string')
  title!: string;
  
  @field('string')
  content!: string;
  
  @link('user')
  author!: string; // References a User by ID
}

// Create a schema with our types
const schema = new Schema('blog', {
  users: new Table<User>('users', {
    definition: User,
    // Optional encryption configuration
    encryption: {
      enabled: true,
      key: 'your-encryption-key'
    }
  }),
  
  posts: new Table<BlogPost>('posts', {
    definition: BlogPost
  })
});
```

### Initialize with Cinderlink Client

```typescript
import { createClient } from '@cinderlink/client';

const client = await createClient({
  // Client configuration
});

// Load the schema into the client
await client.schema.load(schema);

// Get a table reference
const users = client.schema.getTable<User>('blog', 'users');

// Insert data
const userId = await users.insert({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30
});

// Query data
const user = await users.get(userId);
console.log(user); // { name: 'Alice', email: 'alice@example.com', age: 30 }
```

## Core Concepts

### Schema

A schema is a collection of related tables. It can be encrypted as a whole for data privacy.

### Table

A table represents a collection of documents with a defined structure. Each table is stored as an IPLD DAG.

### Fields

Fields define the structure of your data. Supported types include:

- `string`
- `number`
- `boolean`
- `object`
- `array`
- `date`
- `binary`
- `cid` (for IPLD links)
- `did` (for decentralized identity references)

### Links

Links create relationships between documents in different tables:

```typescript
class Comment {
  @field('string')
  text!: string;
  
  @link('users')
  author!: string; // References a user ID
  
  @link('posts')
  post!: string; // References a post ID
}
```

## Advanced Usage

### Querying

```typescript
// Find all users over 18
const adults = await users.query({
  where: {
    age: { $gt: 18 }
  },
  orderBy: {
    name: 'asc'
  },
  limit: 10
});

// Find by related documents
const userPosts = await posts.query({
  where: {
    author: userId
  }
});
```

### Transactions

```typescript
await client.schema.transaction('blog', async (tables) => {
  const { users, posts } = tables;
  
  const userId = await users.insert({
    name: 'Bob',
    email: 'bob@example.com'
  });
  
  await posts.insert({
    title: 'My First Post',
    content: 'Hello, world!',
    author: userId
  });
});
```

## Performance Considerations

- Use indexes for frequently queried fields
- Consider denormalization for read-heavy operations
- Be mindful of IPLD DAG size and structure
- Use pagination for large result sets

## Contributing

Contributions are welcome! Please ensure all code follows the project's coding standards and includes appropriate tests.
