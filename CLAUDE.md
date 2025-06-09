# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cinderlink is a modular, peer-to-peer framework for building decentralized applications. It provides:
- Decentralized identity (DIDs) with Ethereum wallet integration
- P2P networking via libp2p
- IPFS/Helia for distributed storage with IPLD databases
- Plugin-based architecture for extensibility
- Offline-first support with synchronization
- End-to-end encryption capabilities

## Key Commands

### Development
```bash
# Install dependencies (use pnpm, not npm/yarn)
pnpm install

# Build all packages
pnpm build

# Watch mode - rebuilds on changes
pnpm watch

# Run tests
pnpm test

# Development mode
pnpm dev
```

### Working with specific packages
```bash
# Build specific package
turbo build --filter=@cinderlink/client

# Test specific package
pnpm --filter=@cinderlink/ipld-database test

# Watch specific package
turbo watch --filter=@cinderlink/server
```

### Running the server
```bash
# Example server
cd examples/server-example
pnpm example

# Or using the server binary (after building)
pnpm cinderlink
```

## Architecture

### Monorepo Structure
- **packages/** - Core framework packages
  - `client` - P2P client implementation
  - `server` - Federated server implementation
  - `core-types` - Shared TypeScript types
  - `identifiers` - DID management
  - `ipld-database` - IPLD-based storage
  - `protocol` - Network protocols
  - Plugin packages (`plugin-*`) for extensibility

### Key Technologies
- **TypeScript** with ESM modules
- **libp2p** for P2P networking
- **IPFS/Helia** with IPLD for distributed storage
- **DIDs** (did:key) for decentralized identity
- **viem** for Ethereum wallet integration
- **Vitest** for testing (both jsdom and node environments)
- **Turbo** for monorepo orchestration
- **tsup** for building packages

### Plugin Architecture
Plugins follow the pattern `@cinderlink/plugin-[name]` and include:
- Social features (profiles, posts, chat)
- Identity server
- Database synchronization
- Offline message sync
- Remote console administration

### Testing Strategy
- Tests are organized by environment in `vitest.workspace.ts`
- Browser tests use jsdom environment
- Node tests use node environment
- Run all tests with `pnpm test`
- Test specific files with standard vitest patterns

## Important Context

### Current Development Focus
The project is actively modernizing its IPFS/Helia integration. Check `TRACKING.md` for current tasks grouped by implementation area.

### Workflow
1. Feature branches follow pattern: `feat/groupX-task-description`
2. Always run tests before commits: `pnpm test`
3. Build before testing: `pnpm build`
4. Refer to `WORKFLOW.md` for detailed development practices

### Package Dependencies
Packages have interdependencies managed by Turbo. Common dependency order:
1. `core-types` (base types)
2. `identifiers`, `protocol` (core functionality)
3. `ipld-database` (storage layer)
4. `client`/`server` (main implementations)
5. Plugins (extend core functionality)

### File Patterns
- Source files: `src/**/*.ts`
- Tests: `src/**/*.test.ts` or `src/**/*.spec.ts`
- Build output: `dist/`
- Types: `dist/*.d.ts`