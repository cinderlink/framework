# Schema-Driven Plugin Architecture Implementation Plan

## Current State Analysis

### Issues with Current ZodPluginBase
1. **Type Constraints Too Restrictive**: Generic constraints cause TypeScript to infer `never` types
2. **Schema Structure Inflexible**: Fixed schema structure doesn't allow for optional categories
3. **Type Inference Problems**: Methods like `sendValidated` can't properly infer types from schemas
4. **Complex Generic Constraints**: Over-constrained generics make the API hard to use

### Current Working Example
The `protocolSchemas` in `/packages/protocol/src/zod-schemas.ts` shows the intended structure but reveals type system issues.

## Target Architecture

### Core Principle
**Plugin authors provide schemas → System automatically provides type safety + validation**

### Schema Structure
```typescript
type PluginSchemas = {
  p2p?: Record<string, z.ZodSchema>;      // P2P message types
  pubsub?: Record<string, z.ZodSchema>;   // Pub/sub topic types  
  emit?: Record<string, z.ZodSchema>;     // Plugin event types
  // Optional categories - plugins only define what they use
};
```

### Type-Safe API Surface
```typescript
class ZodPluginBase<TSchemas extends PluginSchemas> {
  // Automatically typed based on schema
  protected sendValidated<TEvent extends keyof TSchemas['p2p']>(
    peerId: string,
    event: TEvent, 
    payload: z.infer<TSchemas['p2p'][TEvent]>
  ): Promise<void>
  
  // Handler creation with automatic validation
  protected createHandler<TEvent extends keyof TSchemas['p2p']>(
    event: TEvent,
    handler: (payload: z.infer<TSchemas['p2p'][TEvent]>) => Promise<void>
  ): PluginEventHandler
}
```

## Implementation Steps

### Phase 1: Fix Type System Foundation
1. **Redesign Schema Types**: Make categories optional, fix generic constraints
2. **Simplify Method Signatures**: Remove over-complex constraints
3. **Test Type Inference**: Ensure schemas properly infer to method types

### Phase 2: Implement Core Functionality  
1. **Schema Validation**: Runtime validation using provided schemas
2. **Method Implementation**: Type-safe `sendValidated`, `publishValidated`, etc.
3. **Handler Creation**: Automatic validation in event handlers

### Phase 3: Developer Experience
1. **Factory Functions**: `createSimplePlugin()` for common use cases
2. **Documentation**: Clear examples and migration guide
3. **Migration Path**: Convert existing plugins to schema-driven approach

### Phase 4: Testing & Validation
1. **Unit Tests**: Verify type safety and runtime validation
2. **Integration Tests**: Test with real plugin implementations
3. **Documentation Tests**: Ensure examples actually work

## Success Criteria

1. **Type Safety**: Plugin methods are fully typed based on schemas
2. **Runtime Safety**: All messages validated against schemas
3. **Developer Experience**: Simple, predictable API
4. **Migration Path**: Clear path from old plugin system
5. **Performance**: No significant runtime overhead

## Non-Negotiables

- **No Type Workarounds**: Fix types properly, don't use `any` or type assertions
- **Schema-First**: All validation must be schema-driven
- **Backwards Compatibility**: Provide clear migration path
- **Performance**: Runtime validation must be efficient
- **Documentation**: All APIs must be documented with examples

## Next Steps

1. Fix ZodPluginBase type system issues
2. Implement working example with protocol plugin
3. Create factory function approach
4. Test type inference end-to-end
5. Document and iterate based on real usage