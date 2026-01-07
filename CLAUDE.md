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
# Install dependencies (use bun, migrated from pnpm)
bun install

# Build all packages
bun run build

# Watch mode - rebuilds on changes
bun run watch

# Run tests
bun test

# Development mode
bun run dev
```

### Working with specific packages
```bash
# Build specific package
bun run build --filter=@cinderlink/client

# Test specific package
bun --filter=@cinderlink/ipld-database test

# Watch specific package
bun run watch --filter=@cinderlink/server
```

### Running the server
```bash
# Example server
cd examples/server-example
bun run example

# Or using the server binary (after building)
bun cinderlink
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
- **TypeScript** with ESM modules (strict type safety required)
- **tshy** for hybrid ESM/CommonJS package builds
- **libp2p** for P2P networking
- **IPFS/Helia** with IPLD for distributed storage
- **DIDs** (did:key) for decentralized identity
- **viem** for Ethereum wallet integration
- **Vitest** for testing (both jsdom and node environments)
- **Turbo** for monorepo orchestration

### Plugin Architecture
Plugins follow the pattern `@cinderlink/plugin-[name]` and include:
- Social features (profiles, posts, chat)
- Identity server
- Database synchronization
- Offline message sync
- Remote console administration

### Testing Strategy
**Test Runner**: Vitest (chosen over Bun's built-in test runner for feature completeness)
- **Why Vitest**: Better test isolation, comprehensive mocking, fake timers, and seamless Vite integration
- **Caveat**: Bun's test runner is faster but lacks essential features like proper test isolation and fake timers
- Tests are organized by environment in `vitest.workspace.ts`
- Browser tests use jsdom environment  
- Node tests use node environment
- Run all tests: `bun run test` (runs vitest, NOT `bun test` which uses Bun's test runner)
- Run package tests: `bun --filter='@cinderlink/package-name' run test`
- Test specific files with standard vitest patterns

## Important Context

### Current Development Focus
The project is actively modernizing its IPFS/Helia integration. Check `TRACKING.md` for current tasks grouped by implementation area.

### Workflow
1. Feature branches follow pattern: `feat/groupX-task-description`
2. Always run tests before commits: `bun run test` (uses Vitest)
3. Build before testing: `bun run build`
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

## TypeScript Best Practices

- **Never use `any` types** - Always create proper, thoughtful type definitions
- Use strict TypeScript configuration with `noImplicitAny: true` 
- Prefer type safety over convenience - take the time to define proper types
- Use union types, generics, and conditional types to create flexible yet safe APIs
- When importing from external libraries, ensure proper type definitions are available
- ESLint is configured to prevent `any` type usage with strict rules
- All commits are protected by pre-commit hooks that run linting and type checking

## Code Quality & Linting

- ESLint configured with strict TypeScript rules
- Pre-commit hooks enforce linting and type checking
- Run `bun run lint` to check code style
- Run `bun run lint:fix` to auto-fix issues
- Run `bun run typecheck` to verify TypeScript types

## Development Standards

### File Management - "One Right Version" Approach

**NEVER create versioned or duplicate files.** We maintain a strict "one right version" policy:

- ❌ **Never create**: `file-v2.ts`, `file-new.ts`, `file-backup.ts`, `file-legacy.ts`
- ❌ **Never create**: alternative implementations alongside existing ones
- ✅ **Always do**: Replace the existing implementation entirely with the improved version
- ✅ **Always do**: Delete old/temporary implementations after replacement

**Rationale**: Multiple versions create confusion, maintenance burden, and inconsistent usage patterns. The codebase should have exactly one canonical implementation for each concept.

**Examples**:
- When improving `ZodPluginBase`, replace the existing file entirely rather than creating `ZodPluginBase-v2`
- When refactoring a component, edit the original file rather than creating a new one
- Delete any backup or alternative versions after completing improvements

### Type Safety Standards

- **Zero tolerance for `any` types** - Always create specific, thoughtful type definitions
- **Zero tolerance for manual type casting** - Use proper type inference and validation
- **Complete type safety** - Every function parameter and return value must be properly typed
- Handler methods should automatically infer types from schema definitions without manual annotations

### Plugin Architecture Standards

- All plugins must extend `ZodPluginBase` with proper schema definitions
- Use `getEventHandlers()` method to define type-safe event handlers
- All event payloads must be validated against Zod schemas
- No manual type casting - rely on schema-based type inference
- Handler signatures must use `TypedIncomingMessage<EventPayloadType<...>>` for full type safety