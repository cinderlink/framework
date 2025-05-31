# Helia Migration Plan

This document outlines the steps for migrating the framework from `ipfs-core` to the Helia stack. Each step will be carried out in a separate pull request.

## Steps

1. **Update Dependencies**
   - Replace `ipfs-core` packages with `helia` and the required `@helia/*` modules across all `package.json` files.
   - Ensure version numbers reference the latest available releases.
2. **Create Helia Node Helper**
   - Implement a helper function that creates a Helia node with WebSocket transport, Noise encryption and Mplex stream muxer.
   - Return the Helia instance typed with its Libp2p instance.
3. **Update Core Types**
   - Update `packages/core-types` to export Helia-based type definitions.
4. **Refactor Client and Plugins**
   - Replace calls to deprecated IPFS APIs (`ipfs.dag`, `ipfs.pin`, `ipfs.add`/`cat`, `ipfs.swarm`, `ipfs.name`) with the equivalent Helia modules (`helia.dag`, `helia.pins`, `helia.add`/`cat`, `helia.libp2p.dial`, `@helia/name`).
5. **Switch HTTP Packages**
   - Replace `ipfs-http-server` and `ipfs-http-gateway` with `@helia/http-api` and `@helia/http-gateway`.
6. **Update Tests**
   - Ensure unit tests create Helia nodes and update any API mocks.

Each pull request will focus on one of these steps to keep changes easy to review.
