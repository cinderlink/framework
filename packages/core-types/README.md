# @cinderlink/core-types

Core TypeScript interfaces, types, enums, and constants used throughout the Cinderlink framework.

## Purpose

This package serves as the source of truth for type definitions used by `@cinderlink/client` and its associated modules/plugins. It ensures type safety and consistency across the Cinderlink ecosystem.

## Structure

Types are organized into logical subdirectories:

- `client/`: Core client interfaces and types
- `dag/`: IPLD DAG-related types
- `database/`: Database schema and table definitions
- `files/`: File handling types
- `identity/`: Identity and DID-related types
- `ipfs/`: IPFS/Helia interface types
- `logger/`: Logging interfaces
- `p2p/`: P2P networking types
- `plugin/`: Plugin system interfaces
- `protocol/`: Protocol message types
- `pubsub/`: PubSub-related types
- `sync/`: Data synchronization types

## Key Exports

### Core Interfaces

- `CinderlinkClientInterface`: Main client interface
- `PluginInterface`: Base interface for all plugins
- `SchemaInterface`: Database schema interface
- `TableInterface`: Database table interface

### Type Utilities

- `DeepPartial<T>`: Make all properties in T optional, recursively
- `Constructor<T>`: Constructor type
- `AsyncReturnType<T>`: Extract return type from async function

## Usage

```typescript
import type { 
  CinderlinkClientInterface,
  PluginInterface,
  SchemaInterface
} from '@cinderlink/core-types';

// Example plugin implementation
class MyPlugin implements PluginInterface {
  constructor(public client: CinderlinkClientInterface) {}
  
  async start() {
    // Plugin startup logic
  }
  
  async stop() {
    // Plugin cleanup logic
  }
}
```

## Development

When adding new types:

1. Place them in the most appropriate subdirectory
2. Use descriptive, specific type names
3. Add JSDoc comments for complex types
4. Consider backward compatibility when modifying existing types

## Versioning

This package follows semantic versioning. Breaking changes to types will result in a major version bump.
