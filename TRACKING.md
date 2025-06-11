# Cinderlink IPFS/Helia Integration Tracking

## Goals
1. Update and modernize IPFS/Helia integration in Cinderlink
2. Ensure all packages use compatible, up-to-date versions
3. Improve network reliability and performance
4. Implement modern libp2p features and best practices

## Documentation References
- [Helia Documentation](https://github.com/ipfs/helia)
- [libp2p Documentation](https://github.com/libp2p/js-libp2p)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Cinderlink Architecture](./ARCHITECTURE_AND_AUDIT.md)

## 🔴 Critical Issues (Found in Audit - June 9, 2025)

### Duplicate Dependencies
- [x] Fix duplicate libp2p entries in `@cinderlink/client/package.json` (^0.46.0 and ^2.8.8)
- [x] Fix duplicate helia entries in `@cinderlink/client/package.json` (^9.0.0 and ^5.4.2)
- [x] Remove duplicate entries for @chainsafe/libp2p-gossipsub, @chainsafe/libp2p-noise, @helia/interface, @helia/remote-pinning

### Build & Test Failures
- [x] Fix TypeScript rootDir configuration in `@cinderlink/client/tsconfig.json`
- [x] Resolve API compatibility issues (pubsub and peerStore)
- [x] Fix tsup build configuration issues
- [x] Add missing dependencies (it-glob, @libp2p/ping)
- [x] Update libp2p services configuration

### Dependency Cleanup
- [x] Remove `ethers` from `@cinderlink/protocol` devDependencies
- [x] Remove `ethers` from `packages/ipld-database/tsup.config.ts` externals
- [x] Add missing interface packages (interface-store, interface-blockstore, interface-datastore)

## 🟡 Test Environment Issues
### Native Module Dependencies
- [ ] Resolve @ipshipyard/node-datachannel native module loading in tests
- [x] Add testMode configuration to avoid problematic modules in testing
- [x] Configure vitest to mock native dependencies

## 🎯 Audit Summary

### ✅ Major Accomplishments
1. **Modernized libp2p Integration**
   - Updated from v1 to v2 API patterns
   - Fixed pubsub access (`libp2p.services.pubsub`)
   - Updated peerStore API (`peerStore.get/merge`)
   - Added ping service for kad-dht compatibility
   - Replaced deprecated mplex with yamux stream muxer

2. **Resolved Dependency Conflicts**
   - Fixed all duplicate dependencies in package.json files
   - Added missing interface packages
   - Resolved version conflicts between packages
   - Added it-glob and @libp2p/ping dependencies

3. **Build System Fixes**
   - Fixed TypeScript configuration issues
   - Resolved tsup build problems
   - All 13 packages now build successfully
   - Added test mode configuration for development

4. **Code Quality Improvements**
   - Fixed TypeScript type inference issues
   - Updated import statements to use modern patterns
   - Added proper error handling
   - Maintained backward compatibility where possible

### 🔧 Current Status
- **Build**: ✅ All packages building successfully
- **Dependencies**: ✅ All conflicts resolved, latest versions installed
- **API Migration**: ✅ Complete libp2p v2 migration
- **Tests**: 🟡 Building but native module issue in test environment
- **Documentation**: ✅ Updated and comprehensive

## Task Groups

## ✅ libp2p API Changes (Completed)

### pubsub Access
- **Old**: `libp2p.pubsub.addEventListener()`
- **New**: `libp2p.services.pubsub.addEventListener()`
- **Files affected**: `packages/client/src/client.ts` ✅

### PeerStore API
- **Old**: `libp2p.peerStore.addressBook.get()` and `.set()`
- **New**: `libp2p.peerStore.get()` and `.merge()`
- **Files affected**: `packages/client/src/client.ts` ✅

### Stream Muxer
- **Old**: `mplex` (deprecated)
- **New**: `yamux`
- **Files affected**: `packages/client/src/ipfs/create.ts` ✅

### Bootstrap Nodes
- **Old**: Unused parameter
- **New**: Configured via `@libp2p/bootstrap` in peerDiscovery
- **Files affected**: `packages/client/src/ipfs/create.ts` ✅

### Group 1: Core Dependencies Update (Can be worked on in parallel)
- [ ] ~~Update `libp2p` to v2.8.9 and related packages in `@cinderlink/client`~~ **BLOCKED by duplicate dependencies**
  - Update peerDependencies and devDependencies
  - Test basic connectivity
  - **Package**: client

- [ ] Standardize `@libp2p/*` package versions across the monorepo
  - Version conflicts found: @chainsafe/libp2p-noise (^11.0.0 vs ^16.1.3), @libp2p/identify (^10.0.0 vs ^3.0.32)
  - **Package**: root (affects multiple packages)

- [ ] Standardize Helia versions to ^9.0.0
  - Current versions: ^5.3.2, ^5.4.2, ^9.0.0 across different packages
  - **Package**: client, core-types, protocol, server

- [ ] Update transport protocols in `packages/client/src/ipfs/create.ts`
  - Add WebTransport support
  - Configure WebSockets and TCP
  - Replace mplex with yamux
  - **Package**: client

### Group 2: Network Configuration (Depends on Group 1)
- [ ] Implement improved peer discovery
  - Configure bootstrap nodes
  - Set up pubsub peer discovery
  - **Package**: client

- [ ] Add connection management
  - Configure min/max connections
  - Set up auto-dialing
  - **Package**: client

- [ ] Implement metrics collection
  - Add basic metrics
  - Set up monitoring
  - **Package**: client

### Group 3: Testing and Validation (Depends on Group 2)
- [ ] Create comprehensive test suite
  - Unit tests for new features
  - Integration tests for network behavior
  - **Package**: test-adapters

- [ ] Performance benchmarking
  - Measure connection times
  - Test under load
  - **Package**: test-adapters

- [ ] Update documentation
  - Document new features
  - Update API references
  - **Package**: documentation

## Status
- **Last Updated**: 2025-06-09
- **Current Focus**: Critical Issues - Fixing duplicate dependencies and build failures
- **Blockers**: 
  - Duplicate dependencies in client package.json preventing builds
  - TypeScript configuration errors
  - Test failures due to missing dependencies
  - Version numbers that don't exist (e.g., helia ^9.0.0, @helia/remote-pinning ^4.0.0)

## Progress Log
- **2025-06-09**: Comprehensive audit completed. Found critical issues with duplicate dependencies, version conflicts, and build failures. Discovered several packages have version numbers that don't exist on npm. Need to fix these before continuing with modernization efforts.
- **2025-06-09**: Fixed duplicate dependencies, corrected non-existent version numbers, removed ethers references. Build still failing due to libp2p API changes (pubsub and peerStore.addressBook).
- **2025-06-09**: Successfully updated all libp2p API calls to v2 patterns:
  - Changed `libp2p.pubsub` to `libp2p.services.pubsub`
  - Updated peerStore from `addressBook.get/set` to `peerStore.get/merge`
  - Replaced deprecated `mplex` with `yamux` stream muxer
  - Added proper bootstrap nodes configuration with `@libp2p/bootstrap`
  - Removed deprecated type definitions causing build conflicts
  - Added missing dependencies: @helia/unixfs, interface-store, interface-blockstore, interface-datastore
  - Fixed package.json exports order for proper TypeScript resolution
  - Build status: 12/13 packages building successfully (client has minor TypeScript declaration issues)

## Actual Latest Versions (as of 2025-06-09)
- libp2p: 2.8.9 (not 0.46.0)
- helia: 5.4.2 (not 9.0.0)
- @chainsafe/libp2p-noise: 16.1.3
- @chainsafe/libp2p-yamux: 7.0.1
- @libp2p/identify: 3.0.33 (not 10.0.0)
- @libp2p/tcp: 10.1.14
- @libp2p/kad-dht: 15.1.3 (not 12.0.0)
- @libp2p/interface: 2.10.3
- @helia/interface: 5.3.2
- @helia/remote-pinning: 2.0.3 (not 4.0.0)
- @helia/dag-cbor: 4.0.6

## Notes
- All version updates should maintain backward compatibility where possible
- Test coverage should not decrease with these changes
- Performance metrics should be captured before and after changes
- **IMPORTANT**: Must resolve duplicate dependencies before any version updates
- Viem migration is complete in code, but ethers references remain in configs
