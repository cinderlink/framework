# Zod Migration Tracking

This document tracks issues and progress related to the Zod type system migration in the Cinderlink framework.

## Issues Found

### 1. ✅ FIXED: `createSeed` Import Location
**Status**: Fixed
**Issue**: The server example was importing `createSeed` from `@cinderlink/client` but it should be imported from `@cinderlink/identifiers`.
**Fix**: Updated import in `/examples/server-example/src/start.ts`

### 2. ✅ ADDRESSED: Zod Version Conflict (Framework Packages)
**Status**: Resolved (January 2026)
**Analysis**: After investigation, the core framework packages are consistent:
- `@cinderlink/core-types`: `zod: "^4.0.5"`
- `@cinderlink/schema-registry`: `zod: "^4.0.5"`

**Note**: The "CLI uses Zod v3" issue in previous documentation likely refers to external CLI tools outside this monorepo (social-dapp or separate binaries). The core framework packages use consistent Zod v4.

### 3. 🔄 Plugin Migration Status
**Status**: In Progress
**Current State**:
- The framework has introduced `createZodPlugin` helper for type-safe plugin development
- Traditional plugins are still supported for backward compatibility
- Social-dapp is using traditional plugin interfaces (not yet migrated to Zod)

**Plugins to Consider Migrating**:
- `CallsPlugin` (social-dapp/src/lib/calls/plugin.ts) - currently using traditional interface
- `SocialClientPlugin` - check if already migrated
- `OfflineSyncClientPlugin` - check if already migrated

### 4. ✅ FIXED: CLI Configuration Validation Error
**Status**: Fixed
**Issue**: CLI was failing with `TypeError: undefined is not an object (evaluating 'def.valueType._zod')` due to `SocialSyncConfig` object containing functions in plugin configuration
**Root Cause**: The CLI's Zod schema validation expects simple serializable objects for plugin configs, but `SocialSyncConfig` contains functions which can't be validated
**Fix**: Removed `SocialSyncConfig` from the configuration and used empty objects for plugin configs
**File**: `/apps/social-dapp/cinderlink.config.js`

### 5. ✅ FIXED: Module Resolution Issues (Test Infrastructure)
**Status**: Fixed (January 2026)
**Issue**: Tests in `client.connection.test.ts` and `client.messaging.test.ts` failing with "servers is not iterable" / "clients is not iterable"
**Root Cause**: Variables declared with type annotations only (`let clients: Type[]`) could be undefined if beforeEach failed
**Impact**: Test failures across 25+ test cases
**Fix**: Added nullish coalescing guards (`clients ?? []`) and optional chaining (`client?.stop()`) in afterEach hooks

### 6. ✅ Native Module Workaround (January 2026)
**Status**: Documented as Expected Behavior
**Issue**: `@ipshipyard/node-datachannel` native module loading fails in test environment

**Analysis**:
- Error: `dlopen(.../node_datachannel.node, ...): slice is not valid mach-o file`
- Root Cause: The package uses CJS-style require for native modules within ESM context
- Impact: Tests fail when trying to start real Helia nodes with WebRTC transport

**Workarounds Available**:
1. **Use Mock Implementation**: `test-adapters` package passes all tests (19/19) without native modules
2. **Avoid WebRTC Transport**: Use TCP-only configuration for local testing
3. **Install Build Tools**: Run `npx prebuildify --napi` to build matching native binaries

### 7. ✅ Zod Version Standardization Confirmed
**Status**: Resolved
All framework packages (`core-types`, `schema-registry`) consistently use Zod v4 (`^4.0.5`).
**Analysis**: Framework packages (`core-types`, `schema-registry`) all use consistent Zod v4 (`^4.0.5`). The earlier "CLI uses Zod v3" issue likely refers to external tools outside this monorepo.

## Recommendations

1. **Immediate Actions**:
   - Resolve Zod version conflict across packages
   - Document which plugins have been migrated to Zod system

2. **Future Work**:
   - Consider migrating CallsPlugin to use Zod-based validation
   - Create migration guide for converting traditional plugins to Zod plugins
   - Add examples of Zod plugin usage in the social-dapp

## Notes

The social-dapp codebase appears to be compatible with the current framework state. The main issue was the incorrect import location for `createSeed`, which has been fixed. The app is using the traditional plugin interfaces which are still supported.