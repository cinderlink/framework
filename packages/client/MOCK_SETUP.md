# Bun Migration - Client Test Mocks Setup

## Problem
Client tests were failing with:
```
error: Cannot find module '../../../build/Release/node_datachannel.node'
```

This occurred because libp2p/gossipsub loads native WebRTC dependencies.

## Solution
Created Bun-specific mock files:

1. **native-modules-bun.ts** - Uses Bun's `mock.module()` API
   - Mocks @ipshipyard/node-datachannel (WebRTC native module)
   - Mocks @chainsafe/libp2p-gossipsub  
   - Mocks node:worker_threads
   - Mocks node:crypto (keeps functionality, disables problematic parts)
   - Mocks node:fs (keeps functionality)

2. **Updated all client test files** to:
   - Import `bun:test` instead of `vitest`
   - Import mock files at top level
   - Remove `vi` references

## Usage
Test files now need to:
```typescript
import "../__mocks__/native-modules-bun.js";
import "../__mocks__/node-datachannel.js";
```

This ensures mocks are loaded before any libp2p code runs.

## Next Steps
1. Update all remaining test files to use bun:test imports
2. Test if mocks resolve native module issues
3. Update mock implementations to match Bun's API as needed
