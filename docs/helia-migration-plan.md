# Helia Migration Plan

This document outlines the steps for migrating the framework from `ipfs-core` to the Helia stack. Each step will be carried out in a separate pull request.

## Completed Steps

### 1. **Update Dependencies** - COMPLETED
   - Replaced all `ipfs-core` packages with `helia` and the required `@helia/*` modules across all `package.json` files.
   - Updated to latest available releases:
     - `helia`: `^5.4.2` (previously `^1.0.0`)
     - `libp2p`: `^2.8.8` (previously `^0.44.0`)
     - `@libp2p/*` interfaces: Updated to latest compatible versions
     - `@helia/unixfs`: `^5.0.3` (new, replaces basic UnixFS functionality)
     - `@helia/dag-cbor`: `^1.0.3` (replaces `@helia/dag`)
     - `@helia/dag-json`: `^1.0.3` (replaces `@helia/dag`)
     - `@helia/ipns`: `^9.0.0` (replaces `@helia/name`)
     - `@helia/http-gateway`: `^2.1.2` (updated from `^1.0.0`)
     - `@helia/http-api`: `^5.0.0` (updated from `^1.0.0`)
   - Removed last remaining `ipfs-core-types` import and replaced with local interface

## In Progress Steps

### 2. **Create Helia Node Helper** - IN PROGRESS
   - Implement a helper function that creates a Helia node with WebSocket transport, Noise encryption and Mplex stream muxer.
   - Return the Helia instance typed with its Libp2p instance.
   - Update to use libp2p v2.x configuration syntax

### 3. **Update Core Types** - IN PROGRESS
   - Updated `packages/core-types` to remove ipfs-core-types dependency
   - Need to update type definitions to match Helia v5 APIs

## Remaining Steps

### 4. **Refactor Client and Plugins**
   - Replace calls to deprecated IPFS APIs with the equivalent Helia modules:
     - `ipfs.dag` → `@helia/dag-cbor` or `@helia/dag-json`
     - `ipfs.pin` → `helia.pins` (built-in)
     - `ipfs.add`/`cat` → `@helia/unixfs`
     - `ipfs.swarm` → `helia.libp2p.dial`
     - `ipfs.name` → `@helia/ipns`

### 5. **Update HTTP Packages** - PARTIALLY COMPLETE
   - Updated `@helia/http-api` and `@helia/http-gateway` to latest versions
   - Need to update implementation code to match new APIs

### 6. **Update Tests**
   - Ensure unit tests create Helia nodes and update any API mocks.
   - Update test configurations for new libp2p v2.x APIs

## Breaking Changes in v5

### Helia v5 Changes:
- `@helia/dag` no longer exists - use `@helia/dag-cbor` or `@helia/dag-json`
- `@helia/name` renamed to `@helia/ipns`
- `@helia/pins` functionality is now built into core Helia
- New `@helia/unixfs` package for file operations

### libp2p v2 Changes:
- Updated configuration syntax
- New interface package versions
- Enhanced connection management

Each pull request will focus on one of these steps to keep changes easy to review.
