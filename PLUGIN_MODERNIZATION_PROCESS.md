# Plugin System Modernization Process

## Overview
Converting from legacy plugin system to Zod-only schema-driven plugins.

## Current Status: Phase 1 - Plugin Conversion

### Phase 1: Convert Existing Plugins to ZodPluginBase
**Goal**: Modernize all existing plugins to use ZodPluginBase before removing legacy infrastructure

### Phase 2: Remove Legacy Plugin Infrastructure  
**Goal**: Delete old plugin types, base classes, and interfaces - Zod only

### Phase 3: Clean Up and Documentation
**Goal**: Update documentation, ensure consistency, fix remaining tests

## Phase 1 Progress: Plugin Conversion

### ✅ Already Modernized
- `CinderlinkProtocolZodPlugin` (packages/protocol/src/zod-plugin.ts) - ✅ COMPLETE

### 🔄 Need to Convert (Source Files Only)
1. **packages/client/src/plugins/base.ts** - Legacy base class (DELETE after conversion)
2. **packages/plugin-identity-server/src/plugin.ts** - Convert to Zod
3. **packages/plugin-offline-sync-client/src/plugin.ts** - Convert to Zod  
4. **packages/plugin-offline-sync-server/src/plugin.ts** - Convert to Zod
5. **packages/plugin-rcon-server/src/plugin.ts** - Convert to Zod
6. **packages/plugin-social-client/src/plugin.ts** - Convert to Zod
7. **packages/plugin-social-server/src/plugin.ts** - Convert to Zod
8. **packages/plugin-sync-db/src/plugin.ts** - Convert to Zod

### Conversion Process per Plugin
1. **Analyze**: Review current plugin functionality and events
2. **Define Schemas**: Create Zod schemas for all message types
3. **Extend ZodPluginBase**: Replace legacy base class
4. **Update Handler Methods**: Use validated event handlers
5. **Test**: Ensure functionality works with new system
6. **Document**: Update any plugin-specific documentation

## Phase 2: Legacy Infrastructure Removal

### Files to Delete (After Phase 1)
- `packages/client/src/plugins/base.ts` - Legacy plugin base
- Legacy types in `packages/core-types/src/plugin/types.ts` (keep Zod types)
- Any old plugin interfaces/types no longer needed

### Files to Update (After Phase 1)
- Client plugin loading/management code
- Plugin registration systems
- Type definitions in core-types

## Phase 3: Cleanup Tasks
- Fix remaining 5 test failures
- Complete package documentation audit
- Ensure all examples use Zod plugins
- Update CONTRIBUTING.md with Zod plugin guidelines

## Implementation Notes

### Schema Design Pattern
```typescript
// Standard schema structure for all plugins
export const pluginSchemas = {
  send: {
    '/plugin/request': z.object({ ... }),
    '/plugin/response': z.object({ ... })
  },
  receive: {
    '/plugin/request': z.object({ ... }),
    '/plugin/response': z.object({ ... })
  },
  publish: {
    '/plugin/broadcast': z.object({ ... })
  },
  subscribe: {
    '/plugin/broadcast': z.object({ ... })
  },
  emit: {
    'plugin:event': z.object({ ... })
  }
};
```

### Plugin Class Pattern
```typescript
export class ModernizedPlugin extends ZodPluginBase<typeof pluginSchemas> {
  constructor(client: CinderlinkClientInterface) {
    super('plugin-id', client, pluginSchemas);
  }
  
  // Handlers use automatic validation
  async handleRequest(message: IncomingP2PMessage) {
    const payload = this.validateEvent('receive', '/plugin/request', message.payload);
    // payload is automatically typed
  }
}
```

## Next Steps
1. Start with simplest plugins first (identity-server, rcon-server)
2. Convert complex plugins last (social-client, sync-db)
3. Test each conversion thoroughly
4. Remove legacy infrastructure only after ALL plugins converted
5. Update documentation to reflect Zod-only approach

## Success Criteria
- ✅ All plugins use ZodPluginBase
- ✅ No legacy plugin code remains
- ✅ All tests pass
- ✅ Clear migration documentation
- ✅ Schema-first development workflow established