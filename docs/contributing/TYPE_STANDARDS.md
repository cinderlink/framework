# Cinderlink Framework TypeScript Type Standards

## Overview

This document establishes the TypeScript type standards and patterns for the Cinderlink framework. The framework uses a sophisticated plugin-based architecture with strong type safety, event-driven communication, and generic type constraints.

## Core Principles

### 1. **Zero `any` Types Policy**
- **NEVER** use `any` types in new code
- Replace existing `any` types with proper generics and constraints
- Use `unknown` when the type is truly unknown and requires type guards
- Prefer union types and discriminated unions over `any`

### 2. **Type Safety Over Convenience**
- Take time to create proper type definitions rather than using shortcuts
- Use strict TypeScript configuration with `noImplicitAny: true`
- Leverage compiler for type checking rather than runtime validation where possible
- Avoid type casting (`as` keyword) - fix root type definitions instead

### 3. **Generic Constraints for Flexibility**
- Use bounded generics with `extends` clauses
- Provide reasonable defaults for generic parameters
- Design types to be composable and extensible

## Type System Architecture

### Zod-Based Runtime Validation

The framework now includes a Zod-based plugin system that provides both compile-time type safety and runtime validation.

#### **ZodPluginBase** - Type-Safe Plugin Development
```typescript
// Define schemas with Zod
const schemas = {
  send: {
    '/my-plugin/request': z.object({
      id: z.string().uuid(),
      data: z.string()
    })
  },
  receive: {
    '/my-plugin/response': z.object({
      id: z.string().uuid(),
      result: z.string(),
      success: z.boolean()
    })
  }
};

// Create plugin with automatic validation
const MyPlugin = createZodPlugin('my-plugin', schemas, {
  handlers: {
    p2p: {
      '/my-plugin/response': async (payload) => {
        // payload is automatically validated and typed!
        console.log(payload.result); // TypeScript knows this is string
      }
    }
  }
});
```

#### **Benefits of Zod Integration**
1. **Single Source of Truth** - Define schema once, get both types and validation
2. **Runtime Safety** - Invalid messages are rejected before processing
3. **Better Error Messages** - Zod provides detailed validation errors
4. **Type Inference** - No need to manually define payload types
5. **Composability** - Schemas can be composed and extended

#### **Schema Design Patterns**
```typescript
// Base schemas for reuse
const timestampSchema = z.object({
  createdAt: z.number(),
  updatedAt: z.number()
});

const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email()
});

// Composed schemas
const userMessageSchema = userSchema.merge(timestampSchema).extend({
  message: z.string(),
  attachments: z.array(z.string()).optional()
});

// Discriminated unions for different message types
const messageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), content: z.string() }),
  z.object({ type: z.literal('image'), url: z.string().url() }),
  z.object({ type: z.literal('file'), path: z.string(), size: z.number() })
]);
```

### Plugin System Types

The plugin system is the core of our type architecture, built around these key interfaces:

#### **PluginEventDef** - Foundation for All Plugin Communication
```typescript
interface PluginEventDef {
  send: PluginEventPayloads<Record<string, unknown>>;
  receive: PluginEventPayloads<Record<string, unknown>>;
  publish: PluginEventPayloads<Record<string, unknown>>;
  subscribe: PluginEventPayloads<Record<string, unknown>>;
  emit: PluginEventPayloads<Record<string, unknown>>;
}
```

#### **Plugin Interface Hierarchy**
```typescript
PluginBaseInterface<Events, Client>
  ↓ extends
PluginInterface<Events, PeerEvents, Client>
```

**Type Parameters:**
- `Events extends PluginEventDef` - Plugin's own event definitions
- `PeerEvents extends PluginEventDef` - Events from other plugins
- `Client extends CinderlinkClientInterface` - Client interface injection

### Database & Schema Types

#### **Type Hierarchy**
```typescript
TableRow (base interface)
  ↓ extends
CustomRow extends TableRow
  ↓ used in
TableDefinition<CustomRow>
  ↓ implemented by
TableInterface<CustomRow, TableDefinition<CustomRow>>
  ↓ contained in
SchemaInterface
```

#### **Generic Patterns**
- All table-related types use `<Row extends TableRow = TableRow>`
- Schema types use `Record<string, TableDefinition<TableRow>>`
- Query builders maintain type safety: `QueryBuilderInterface<Row>`

### Client Interface Types

#### **CinderlinkClientInterface**
```typescript
interface CinderlinkClientInterface<PluginEvents extends PluginEventDef = PluginEventDef>
```

**Key Responsibilities:**
- Type-safe plugin management
- Event-aware communication methods
- Schema management with proper typing

## Current Type Challenges

### Issue 1: Plugin Interface Constraints

**Problem:** Plugin constraints use `any` types causing loss of type safety:
```typescript
// Current problematic pattern
Client extends CinderlinkClientInterface<any>
```

**Solution:** Use proper generic constraints:
```typescript
// Preferred pattern
Client extends CinderlinkClientInterface<Events & ProtocolEvents>
```

**Root Cause:** Circular dependency between client and plugin types where:
- Client needs to know about plugin events
- Plugins need to know about client interface
- Current constraints can't express this relationship properly

### Issue 2: Type Casting in Query System

**Problem:** Complex cache typing requires casting:
```typescript
// Found in query.ts - needs fixing
result as QueryResult<Row>
```

**Solution:** Implement phantom types for cache operations:
```typescript
interface TypedCache<T> {
  readonly _type: T; // phantom type
  get<K extends keyof T>(key: K): T[K];
}
```

### Issue 3: Schema Constructor Type Mismatch

**Problem:** Schema expects generic `TableDefinition<TableRow>` but receives specific types:
```typescript
// Current issue
new Schema("id", SyncSchemaDef, ...) // SyncSchemaDef has specific row types
```

**Solution:** Make Schema generic or use proper type mapping:
```typescript
interface Schema<Defs extends Record<string, TableDefinition<any>>> {
  constructor(id: string, defs: Defs, ...);
}
```

## Type Standards & Patterns

### 1. **Generic Type Parameters**

**Naming Conventions:**
- `T` - Generic type parameter
- `Row extends TableRow` - Database row types
- `Events extends PluginEventDef` - Plugin event types
- `Client extends CinderlinkClientInterface` - Client types
- `Def extends TableDefinition` - Schema definition types

**Default Parameters:**
```typescript
// Always provide reasonable defaults
interface MyInterface<T extends BaseType = BaseType> {
  // ...
}
```

### 2. **Event Type Patterns**

**Plugin Events:**
```typescript
interface MyPluginEvents extends PluginEventDef {
  send: {
    "/my-plugin/action": MyActionPayload;
  };
  receive: {
    "/my-plugin/action": MyActionPayload;
  };
  // ... other event types
}
```

**Message Types:**
```typescript
interface IncomingP2PMessage<
  PluginEvents extends PluginEventDef,
  Topic extends keyof PluginEvents["receive"],
  Encoding extends EncodingOptions = EncodingOptions
> {
  topic: Topic;
  payload: PluginEvents["receive"][Topic];
  peer: Peer;
  // ...
}
```

### 3. **Database Type Patterns**

**Row Definitions:**
```typescript
interface MyCustomRow extends TableRow {
  customField: string;
  optionalField?: number;
}
```

**Table Definitions:**
```typescript
const MyTableDef: TableDefinition<MyCustomRow> = {
  schemaId: "my-schema",
  schemaVersion: 1,
  // ... table configuration
};
```

**Schema Definitions:**
```typescript
const MySchemaDef: {
  myTable: TableDefinition<MyCustomRow>;
  anotherTable: TableDefinition<AnotherRow>;
} = {
  myTable: MyTableDef,
  anotherTable: AnotherTableDef,
};
```

### 4. **Client Interface Patterns**

**Plugin Implementation:**
```typescript
class MyPlugin<
  Client extends CinderlinkClientInterface<MyPluginEvents & ProtocolEvents>
> extends Emittery<MyPluginEvents>
  implements PluginInterface<MyPluginEvents, PluginEventDef, Client> {
  
  constructor(public client: Client) {
    super();
  }
}
```

## Migration Strategy

### Phase 1: Eliminate Type Casting
1. ✅ Remove all `x as y` patterns in plugin files
2. ✅ Fix Schema constructor type constraints
3. 🔄 Fix remaining query system casting
4. ⏳ Address protocol package type issues

### Phase 2: Enhance Plugin Constraints
1. 🔄 Update PluginInterface to remove `any` types
2. ⏳ Implement proper client-plugin-event constraint relationships
3. ⏳ Add variance annotations where needed

### Phase 3: Advanced Type Safety
1. ✅ Implement runtime type validation with Zod integration
2. ⏳ Add compile-time event compatibility checking
3. ⏳ Generate TypeScript types from schema definitions

## Best Practices

### 1. **Type Design Principles**
- **Composition over inheritance** - Use intersection types (`A & B`) where appropriate
- **Discriminated unions** - Use literal types for type discrimination
- **Branded types** - Use phantom types for IDs and unique values
- **Mapped types** - Transform types programmatically

### 2. **Generic Guidelines**
- Always provide defaults for generic parameters
- Use meaningful constraint names (`extends TableRow` not `extends T`)
- Document complex generic relationships
- Prefer generic constraints over type assertions

### 3. **Error Handling**
- Use Result/Either types for operations that can fail
- Provide detailed error types with discriminated unions
- Never use `any` for error handling

### 4. **Performance Considerations**
- Use conditional types sparingly (they're expensive to compute)
- Prefer simple union types over complex mapped types where possible
- Cache complex type computations in type aliases

## Zod Migration Guidelines

### When to Use Zod-Based Plugins

**Use ZodPluginBase when:**
- Building new plugins that handle network messages
- Plugins need runtime validation of external data
- You want automatic type inference from schemas
- Complex validation rules are required

**Continue using traditional plugins when:**
- Plugin doesn't handle external messages
- Performance is critical (Zod adds validation overhead)
- Simple internal-only plugins

### Migration Example

**Before (Traditional Plugin):**
```typescript
class MyPlugin implements PluginInterface {
  p2p = {
    '/my-plugin/message': async (payload: any) => {
      // Manual validation
      if (!payload.text || typeof payload.text !== 'string') {
        throw new Error('Invalid message');
      }
      // Handle message
    }
  };
}
```

**After (Zod Plugin):**
```typescript
const schemas = {
  receive: {
    '/my-plugin/message': z.object({
      text: z.string().min(1).max(1000)
    })
  }
};

const MyPlugin = createZodPlugin('my-plugin', schemas, {
  handlers: {
    p2p: {
      '/my-plugin/message': async (payload) => {
        // Validation is automatic, payload.text is typed as string
        // Handle message
      }
    }
  }
});
```

## Conclusion

The Cinderlink framework's type system is designed for maximum type safety while maintaining the flexibility needed for a plugin-based architecture. With the addition of Zod-based validation, we now have:

- **Compile-time type safety** through TypeScript's type system
- **Runtime validation** through Zod schemas
- **Single source of truth** for both types and validation
- **Plugin composability** through proper generic constraints
- **Developer experience** with excellent IDE support and error messages
- **Maintainability** through clear type relationships and patterns

All new plugins should use the Zod-based system when handling external data, and existing plugins should be gradually migrated to eliminate any remaining type safety issues.