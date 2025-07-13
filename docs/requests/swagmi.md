# Swagmi Enhancement Requests

## Overview

Request for enhancements to the `swagmi` library to better support Cinderlink's decentralized identity and wallet management patterns, particularly for Svelte 5 and framework-agnostic usage.

## Background

### Current Usage in social-dapp
Currently, social-dapp manually handles:
- Wallet connection via `fetchSigner()` from `@wagmi/core`
- DID creation with `createSignerDID()` 
- Address verification signing with `signAddressVerification()`
- Session storage management for entropy and verification data
- Manual signer access for contract interactions

### Pain Points
1. **Manual Session Management**: Entropy and verification data stored manually in sessionStorage
2. **Repetitive Patterns**: Same wallet + DID flow repeated across components
3. **Framework Coupling**: Direct dependency on `@wagmi/core` in business logic
4. **State Synchronization**: Manual syncing between wallet state and identity state
5. **Error Handling**: Inconsistent error handling across wallet operations
6. **Type Safety**: Limited TypeScript integration for DID-specific operations

## Requested Enhancements

### 1. Enhanced Identity Management

#### Auto-DID Creation Hook
```typescript
// Requested API
export function useAutoIdentity(config: AutoIdentityConfig) {
  const { data: identity, error, isLoading } = useAutoIdentity({
    app: 'candor.social',
    nonce: 0,
    persist: true, // Auto-manage sessionStorage
    createOnConnect: true, // Auto-create DID when wallet connects
    storage: 'session' // 'session' | 'local' | 'memory' | custom
  });
  
  return {
    identity, // { did: DID, address: string, addressVerification: string }
    error,
    isLoading,
    regenerateIdentity: (newNonce?: number) => Promise<void>,
    clearIdentity: () => void
  };
}

interface AutoIdentityConfig {
  app: string;
  nonce?: number;
  persist?: boolean;
  createOnConnect?: boolean;
  storage?: 'session' | 'local' | 'memory' | StorageAdapter;
  onIdentityChange?: (identity: CinderlinkIdentity | null) => void;
}
```

#### DID Session Persistence
```typescript
// Requested API
export function useDIDPersistence(key?: string) {
  return {
    persistDID: (identity: CinderlinkIdentity) => Promise<void>,
    restoreDID: () => Promise<CinderlinkIdentity | null>,
    clearDID: () => Promise<void>,
    hasPersisted: boolean
  };
}
```

### 2. Unified Signer Management

#### Enhanced Client Access
```typescript
// Current: Manual fetching
const signer = await fetchSigner();
const walletClient = get(wallet).client;

// Requested: Unified client access
export function useClients() {
  return {
    signer: Signer | null,
    walletClient: WalletClient | null,
    publicClient: PublicClient | null,
    isReady: boolean,
    error: Error | null
  };
}
```

#### Message Signing Utilities
```typescript
// Requested API
export function useMessageSigning() {
  return {
    signMessage: (message: string) => Promise<string>,
    signTypedData: (data: TypedData) => Promise<string>,
    signForDID: (message: string, didFormat?: boolean) => Promise<string>,
    verifySignature: (message: string, signature: string, address: string) => boolean
  };
}
```

### 3. Contract Interaction Enhancements

#### Typed Contract Hooks
```typescript
// Current: Manual contract interaction
const hash = await walletClient.writeContract({
  address: AttestationStation.address,
  abi: AttestationStation.abi,
  functionName: 'attest',
  args: [[{ about: address, key: encodedKey, val: BigInt(value) }]]
});

// Requested: Typed contract hooks
export function useTypedContract<TAbi extends Abi>(
  config: UseTypedContractConfig<TAbi>
) {
  return {
    read: <TFunctionName extends string>(
      functionName: TFunctionName,
      args?: unknown[]
    ) => Promise<unknown>,
    
    write: <TFunctionName extends string>(
      functionName: TFunctionName,
      args?: unknown[]
    ) => Promise<WriteContractResult>,
    
    simulate: <TFunctionName extends string>(
      functionName: TFunctionName,
      args?: unknown[]
    ) => Promise<SimulateContractResult>,
    
    // Event subscription with types
    watchEvent: <TEventName extends string>(
      eventName: TEventName,
      listener: (logs: unknown[]) => void
    ) => UnwatchFn
  };
}
```

#### Event Subscription Management
```typescript
// Requested API
export function useContractEvents<TAbi extends Abi>(
  config: UseContractEventsConfig<TAbi>
) {
  return {
    events: Log[],
    subscribe: (eventName: string, listener: EventListener) => UnsubscribeFn,
    unsubscribe: (eventName: string) => void,
    clearEvents: () => void,
    latestEvent: Log | null
  };
}
```

### 4. Svelte 5 Runes Integration

#### Runes-Based Stores
```typescript
// Requested: Native Svelte 5 runes support
export function createWalletRunes() {
  let connected = $state(false);
  let address = $state<string | undefined>(undefined);
  let chainId = $state<number | undefined>(undefined);
  let balance = $state<bigint | undefined>(undefined);
  
  const isReady = $derived(connected && address !== undefined);
  
  return {
    get connected() { return connected; },
    get address() { return address; },
    get chainId() { return chainId; },
    get balance() { return balance; },
    get isReady() { return isReady; },
    
    connect: () => Promise<void>,
    disconnect: () => Promise<void>,
    switchChain: (chainId: number) => Promise<void>
  };
}

export function createIdentityRunes(walletRunes: ReturnType<typeof createWalletRunes>) {
  let identity = $state<CinderlinkIdentity | null>(null);
  let loading = $state(false);
  let error = $state<Error | null>(null);
  
  const hasIdentity = $derived(identity !== null);
  const canCreateIdentity = $derived(walletRunes.connected && !loading);
  
  // Auto-create identity when wallet connects
  $effect(() => {
    if (walletRunes.connected && !identity && !loading) {
      createIdentity();
    }
  });
  
  return {
    get identity() { return identity; },
    get loading() { return loading; },
    get error() { return error; },
    get hasIdentity() { return hasIdentity; },
    get canCreateIdentity() { return canCreateIdentity; },
    
    createIdentity: (nonce?: number) => Promise<void>,
    clearIdentity: () => void,
    regenerateIdentity: (nonce?: number) => Promise<void>
  };
}
```

#### Component Integration
```typescript
// Requested: Svelte 5 component integration
export interface WalletProviderProps {
  children: Snippet<[{ wallet: WalletState, identity: IdentityState }]>;
  fallback?: Snippet<[{ error?: Error }]>;
  config?: WalletConfig;
}

// Usage in components
// <WalletProvider {config}>
//   {#snippet children({ wallet, identity })}
//     <!-- Connected state content -->
//   {/snippet}
//   {#snippet fallback({ error })}
//     <!-- Disconnected/error state -->
//   {/snippet}
// </WalletProvider>
```

### 5. Chain Management Enhancements

#### Multi-Chain DID Support
```typescript
// Requested API
export function useMultiChainIdentity() {
  return {
    identities: Map<number, CinderlinkIdentity>, // chainId -> identity
    activeIdentity: CinderlinkIdentity | null,
    switchChainIdentity: (chainId: number) => Promise<void>,
    createIdentityForChain: (chainId: number, nonce?: number) => Promise<CinderlinkIdentity>,
    getIdentityForChain: (chainId: number) => CinderlinkIdentity | null
  };
}
```

#### Chain-Aware Operations
```typescript
// Requested API
export function useChainAwareOperations() {
  return {
    currentChain: Chain | null,
    supportedChains: Chain[],
    switchChain: (chainId: number) => Promise<void>,
    isChainSupported: (chainId: number) => boolean,
    requireChain: (chainId: number) => Promise<void>, // Auto-switch or throw
    onChainChange: (callback: (chain: Chain) => void) => UnsubscribeFn
  };
}
```

### 6. Error Handling & Recovery

#### Unified Error Management
```typescript
// Requested API
export function useWalletErrors() {
  return {
    errors: WalletError[],
    lastError: WalletError | null,
    clearErrors: () => void,
    clearError: (id: string) => void,
    retryLastOperation: () => Promise<void>,
    onError: (callback: (error: WalletError) => void) => UnsubscribeFn
  };
}

interface WalletError {
  id: string;
  type: 'connection' | 'signing' | 'chain' | 'identity' | 'contract';
  message: string;
  code?: number;
  timestamp: number;
  retryable: boolean;
  retry?: () => Promise<void>;
}
```

### 7. Framework-Agnostic Core

#### Adapter Pattern Support
```typescript
// Requested: Framework-agnostic core that swagmi can wrap
export interface SwagmiAdapter {
  // Core wallet operations
  connect(): Promise<WalletConnection>;
  disconnect(): Promise<void>;
  getAccount(): Promise<Account>;
  
  // Identity operations
  createIdentity(config: IdentityConfig): Promise<CinderlinkIdentity>;
  restoreIdentity(entropy: string): Promise<CinderlinkIdentity>;
  signForIdentity(message: string): Promise<string>;
  
  // Contract operations
  readContract(config: ReadContractConfig): Promise<unknown>;
  writeContract(config: WriteContractConfig): Promise<WriteResult>;
  watchContractEvent(config: WatchEventConfig): UnwatchFn;
  
  // Chain operations
  switchChain(chainId: number): Promise<void>;
  addChain(chain: Chain): Promise<void>;
}

// Framework-specific implementations
export function createSvelteAdapter(core: SwagmiAdapter): SvelteSwagmiAdapter;
export function createReactAdapter(core: SwagmiAdapter): ReactSwagmiAdapter;
export function createVueAdapter(core: SwagmiAdapter): VueSwagmiAdapter;
```

### 8. Development Experience Enhancements

#### DevTools Integration
```typescript
// Requested: Enhanced debugging and development tools
export function useWalletDevTools() {
  return {
    logs: WalletLog[],
    clearLogs: () => void,
    exportLogs: () => string,
    debugMode: boolean,
    setDebugMode: (enabled: boolean) => void,
    inspectState: () => WalletInspection
  };
}
```

#### Testing Utilities
```typescript
// Requested: Testing utilities for identity/wallet flows
export function createMockSwagmi(config?: MockConfig) {
  return {
    mockWallet: MockWallet,
    mockChain: MockChain,
    mockIdentity: MockIdentity,
    simulateConnection: () => Promise<void>,
    simulateSignature: (message: string) => Promise<string>,
    simulateChainSwitch: (chainId: number) => Promise<void>
  };
}
```

## Implementation Priorities

### High Priority (Core Functionality)
1. **Auto-DID Creation Hook** - Eliminates manual DID management
2. **Unified Client Access** - Simplifies signer/client access patterns
3. **Runes Integration** - Native Svelte 5 support
4. **Session Persistence** - Automatic storage management

### Medium Priority (Developer Experience)
1. **Typed Contract Hooks** - Better contract interaction patterns
2. **Error Management** - Centralized error handling
3. **Chain Management** - Multi-chain identity support
4. **Event Subscription** - Simplified event handling

### Low Priority (Advanced Features)
1. **Framework-Agnostic Core** - Support for other frameworks
2. **DevTools Integration** - Enhanced debugging
3. **Testing Utilities** - Better testing support
4. **Multi-Chain DIDs** - Advanced identity patterns

## Migration Strategy

### Phase 1: Core Enhancements
- Implement `useAutoIdentity` hook
- Add runes-based store alternatives
- Enhance client access patterns

### Phase 2: Integration
- Update social-dapp to use new hooks
- Remove manual session management
- Simplify wallet/identity flows

### Phase 3: Advanced Features
- Add typed contract hooks
- Implement multi-chain support
- Enhance error handling

## Expected Benefits

### Code Reduction
- **50-70% reduction** in wallet/identity management code
- **Elimination** of manual session storage management
- **Simplified** error handling patterns

### Type Safety
- **Full TypeScript integration** for DID operations
- **Typed contract interactions** with ABI inference
- **Compile-time validation** of wallet operations

### Developer Experience
- **Declarative patterns** vs imperative wallet management
- **Automatic state synchronization** between wallet and identity
- **Built-in persistence** with configurable storage options

### Framework Integration
- **Native Svelte 5 runes support** for optimal performance
- **Framework-agnostic core** for future React/Vue support
- **Web Components compatibility** for universal usage

This enhancement would significantly reduce boilerplate code in Cinderlink applications while providing better type safety and developer experience for decentralized identity management.