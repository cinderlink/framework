# @cinderlink/identifiers

Tools for creating, resolving, and verifying Decentralized Identifiers (DIDs) in the Cinderlink ecosystem.

## Purpose

This package provides essential functionality for working with DIDs, particularly focusing on:

- Creating `did:key` DIDs from raw seeds
- Generating DIDs by having users sign messages with their existing blockchain wallets
- Resolving DIDs to their associated documents
- Verifying signatures and claims related to these identifiers

## Installation

```bash
npm install @cinderlink/identifiers
# or
yarn add @cinderlink/identifiers
```

## Core Functionality

### DID Creation

#### From Seed

```typescript
import { createDID } from '@cinderlink/identifiers';

// Create a new DID from a random seed
const seed = new Uint8Array(32); // 32 bytes of entropy
const did = await createDID(seed);
console.log(did.did()); // did:key:z6Mk...
```

#### From Ethereum Wallet Signature

```typescript
import { createDIDFromSignature } from '@cinderlink/identifiers';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Initialize wallet client
const account = privateKeyToAccount('0x...');
const client = createWalletClient({
  account,
  transport: http()
});

// Create DID from Ethereum signature
const did = await createDIDFromSignature(client);
console.log(did.did()); // did:key:z6Mk...
```

### DID Resolution

```typescript
import { resolveDID } from '@cinderlink/identifiers';

const didDoc = await resolveDID('did:key:z6Mk...');
console.log(didDoc);
```

### Signature Verification

```typescript
import { verifySignature } from '@cinderlink/identifiers';

const message = 'Hello, world!';
const signature = '...'; // Signature from the DID
const did = 'did:key:z6Mk...';

const isValid = await verifySignature(dID, message, signature);
console.log('Signature valid:', isValid);
```

## API Reference

### `createDID(seed: Uint8Array, provider?: string): Promise<DID>`

Creates a new DID from a seed.

### `createDIDFromSignature(wallet: WalletClient, provider?: string): Promise<DID>`

Creates a new DID by having the user sign a message with their Ethereum wallet.

### `resolveDID(did: string): Promise<DIDDocument>`

Resolves a DID to its DID Document.

### `verifySignature(did: string, message: string, signature: string): Promise<boolean>`

Verifies a signature against a DID.

## Security Considerations

- Always ensure proper key management when working with DIDs
- When using `createDIDFromSignature`, the private key never leaves the user's wallet
- Store seeds securely and never commit them to version control

## Contributing

Contributions are welcome! Please ensure all code follows the project's coding standards and includes appropriate tests.
