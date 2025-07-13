# Zod Migration Tracking

This document tracks issues and progress related to the Zod type system migration in the Cinderlink framework.

## Issues Found

### 1. ✅ FIXED: `createSeed` Import Location
**Status**: Fixed
**Issue**: The server example was importing `createSeed` from `@cinderlink/client` but it should be imported from `@cinderlink/identifiers`.
**Fix**: Updated import in `/examples/server-example/src/start.ts`

### 2. ⚠️ Zod Version Conflict
**Status**: Open
**Issue**: According to the modernization audit, there's a version conflict:
- CLI uses Zod v3
- Other packages use Zod v4
**Impact**: May cause type incompatibilities between packages
**Action Required**: Standardize on a single Zod version across all packages

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

### 5. ⚠️ Module Resolution Issues
**Status**: Ongoing
**Issue**: After config validation passes, server fails with "Cannot find module '@libp2p/peer-id'" error
**Impact**: Prevents server from starting successfully
**Likely Cause**: Packages need to be built before running
**Action Required**: Build framework packages before running server

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