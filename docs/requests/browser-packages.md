# Browser Package Architecture Request

## Overview

Request for designing and implementing `@cinderlink/web` - a comprehensive framework-agnostic package that serves multiple purposes:

1. **Universal Component Library**: UI components that work across all modern frameworks
2. **Identity & Wallet Management**: Framework-agnostic DID and wallet integration 
3. **Documentation Site**: SvelteKit-based documentation and component gallery
4. **Distribution Hub**: Centralized distribution for all browser-facing Cinderlink tools

## Background

### Current Pain Points
- Manual wallet/identity management in `social-dapp` with direct viem/wagmi usage
- Duplicate code patterns across potential future frontend projects
- Need for components that work in React, Vue, and vanilla JS environments
- Lack of centralized documentation for browser-facing APIs

### Svelte 5 Opportunities
- **Runes System**: `.svelte.ts` files enable framework-agnostic reactive state
- **Web Components**: Compile to universal custom elements
- **Bundle Size**: 1.18 kB baseline vs 5.7 kB for Lit Elements
- **TypeScript Integration**: Generics, better type inference, universal typing
- **Event Handling**: `onclick` instead of `on:click` aligns with web standards
- **Snippets**: Replace slots with type-safe, parameter-enabled composition

## Package Architecture

### Multi-Target Compilation Strategy

```
@cinderlink/web/
├── src/
│   ├── core/               # Framework-agnostic TypeScript core
│   │   ├── identity.ts     # Universal identity management
│   │   ├── wallet.ts       # Universal wallet adapters
│   │   ├── storage.ts      # Universal storage adapters
│   │   └── observable.ts   # Universal reactive patterns
│   ├── svelte/             # Svelte 5 runes-based implementations
│   │   ├── identity.svelte.ts
│   │   ├── wallet.svelte.ts
│   │   ├── components/     # Native Svelte components
│   │   └── stores.ts       # Traditional store compatibility
│   ├── react/              # React adapter layer
│   │   ├── hooks.ts        # React hooks wrapping core
│   │   └── components/     # React component wrappers
│   ├── vue/                # Vue Composition API layer
│   │   ├── composables.ts  # Vue composables
│   │   └── components/     # Vue component wrappers
│   ├── web-components/     # Standard Web Components
│   │   ├── identity/       # Identity-related custom elements
│   │   ├── wallet/         # Wallet-related custom elements
│   │   └── ui/             # UI components as custom elements
│   └── vanilla/            # Pure JavaScript API
├── docs/                   # SvelteKit documentation site
│   ├── src/routes/
│   │   ├── docs/           # Documentation pages
│   │   ├── examples/       # Interactive examples
│   │   ├── playground/     # Component playground
│   │   └── api/            # API documentation
│   └── static/             # Static assets
├── dist/                   # Built library outputs
└── docs-dist/              # Built documentation site
```

### Core Design Principles

#### 1. Framework-Agnostic Reactive Core
```typescript
// src/core/identity.ts
export interface IdentityAdapter {
  createIdentity(params: CreateIdentityParams): Promise<CinderlinkIdentity>;
  restoreIdentity(entropy: string): Promise<CinderlinkIdentity>;
  signMessage(message: string): Promise<string>;
}

export class UniversalIdentityManager {
  private state = {
    identity: null as CinderlinkIdentity | null,
    connected: false,
    loading: false
  };
  
  private subscribers = new Set<(state: IdentityState) => void>();
  
  // Universal subscription pattern
  subscribe(callback: (state: IdentityState) => void) {
    this.subscribers.add(callback);
    callback(this.state); // Immediate execution
    return () => this.subscribers.delete(callback);
  }
}
```

#### 2. Svelte 5 Runes Integration
```typescript
// src/svelte/identity.svelte.ts
export function createIdentityStore(manager: UniversalIdentityManager) {
  let identity = $state<CinderlinkIdentity | null>(null);
  let connected = $state(false);
  let loading = $state(false);
  
  $effect(() => {
    const unsubscribe = manager.subscribe((state) => {
      identity = state.identity;
      connected = state.connected;
      loading = state.loading;
    });
    return unsubscribe;
  });
  
  return {
    get identity() { return identity; },
    get connected() { return connected; },
    get loading() { return loading; },
    connect: () => manager.connect(),
    disconnect: () => manager.disconnect()
  };
}
```

#### 3. Web Components for Universal Compatibility
```typescript
// src/web-components/wallet-connect.ts
@customElement('cinderlink-wallet-connect')
export class CinderlinkWalletConnect extends LitElement {
  @property({ type: Object }) walletAdapter?: WalletAdapter;
  @property({ type: String }) variant: 'primary' | 'secondary' = 'primary';
  
  private identityManager = new UniversalIdentityManager();
  
  async connectedCallback() {
    super.connectedCallback();
    if (this.walletAdapter) {
      this.identityManager.setWalletAdapter(this.walletAdapter);
    }
  }
  
  render() {
    return html`
      <button 
        @click=${this.handleConnect}
        class=${this.variant}
      >
        Connect Wallet
      </button>
    `;
  }
}
```

#### 4. Component API Design with Snippets
```svelte
<!-- src/svelte/components/WalletProvider.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { createIdentityStore } from '../identity.svelte.js';
  
  interface Props {
    config: IdentityConfig;
    children: Snippet<[{ identity: CinderlinkIdentity | null, connected: boolean }]>;
    fallback?: Snippet;
  }
  
  let { config, children, fallback }: Props = $props();
  
  const identity = createIdentityStore(config);
</script>

{#if identity.connected}
  {@render children({ identity: identity.identity, connected: identity.connected })}
{:else if fallback}
  {@render fallback()}
{:else}
  <button onclick={() => identity.connect()}>Connect Wallet</button>
{/if}
```

## Build Strategy

### Vite Multi-Target Configuration
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    lib: {
      entry: {
        'index': 'src/index.ts',
        'svelte/index': 'src/svelte/index.ts',
        'react/index': 'src/react/index.ts',
        'vue/index': 'src/vue/index.ts',
        'web-components/index': 'src/web-components/index.ts',
        'vanilla/index': 'src/vanilla/index.ts'
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format}.js`
    },
    rollupOptions: {
      external: ['svelte', 'react', 'vue', '@lit/reactive-element'],
      output: {
        preserveModules: true,
        exports: 'named'
      }
    }
  },
  plugins: [
    svelte({
      compilerOptions: {
        customElement: true // Enable web components compilation
      }
    }),
    dts(), // Generate TypeScript declarations
    libInjectCss() // Inject CSS into bundles
  ]
});
```

### Package Distribution
```json
{
  "name": "@cinderlink/web",
  "type": "module",
  "exports": {
    ".": {
      "svelte": "./dist/svelte/index.js",
      "import": "./dist/index.es.js",
      "require": "./dist/index.cjs.js"
    },
    "./svelte": "./dist/svelte/index.js",
    "./react": "./dist/react/index.js",
    "./vue": "./dist/vue/index.js",
    "./web-components": "./dist/web-components/index.js",
    "./vanilla": "./dist/vanilla/index.js",
    "./styles": "./dist/styles.css"
  },
  "svelte": "./dist/svelte/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "svelte": "^5.0.0",
    "react": "^18.0.0",
    "vue": "^3.0.0"
  },
  "peerDependenciesMeta": {
    "svelte": { "optional": true },
    "react": { "optional": true },
    "vue": { "optional": true }
  }
}
```

## Documentation & Demo Site

### SvelteKit Documentation Architecture
```
docs/src/routes/
├── +layout.svelte          # Main layout with navigation
├── +page.svelte           # Landing page
├── docs/
│   ├── getting-started/    # Installation and basic usage
│   ├── components/         # Component documentation
│   ├── identity/           # Identity management guides
│   ├── wallet/             # Wallet integration guides
│   └── frameworks/         # Framework-specific guides
├── examples/
│   ├── svelte/            # Svelte examples
│   ├── react/             # React examples
│   ├── vue/               # Vue examples
│   └── vanilla/           # Vanilla JS examples
└── playground/
    ├── +page.svelte       # Interactive component playground
    └── components/        # Live component demos
```

### Interactive Component Gallery
```svelte
<!-- docs/src/routes/playground/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import ComponentDemo from '$lib/ComponentDemo.svelte';
  import CodePreview from '$lib/CodePreview.svelte';
  
  let selectedFramework = $state('svelte');
  let selectedComponent = $state('WalletConnect');
  
  const frameworks = ['svelte', 'react', 'vue', 'web-components'];
  const components = ['WalletConnect', 'IdentityProvider', 'PostCreator'];
</script>

<div class="playground">
  <div class="controls">
    <select bind:value={selectedFramework}>
      {#each frameworks as framework}
        <option value={framework}>{framework}</option>
      {/each}
    </select>
    
    <select bind:value={selectedComponent}>
      {#each components as component}
        <option value={component}>{component}</option>
      {/each}
    </select>
  </div>
  
  <div class="demo">
    <ComponentDemo component={selectedComponent} framework={selectedFramework} />
  </div>
  
  <div class="code">
    <CodePreview component={selectedComponent} framework={selectedFramework} />
  </div>
</div>
```

## Integration with Existing Packages

### Cinderlink Core Integration
```typescript
// src/core/cinderlink-bridge.ts
export class CinderlinkBridge {
  private client?: CinderlinkClientInterface;
  private stores = new Map<string, UniversalStore<any>>();
  
  connectClient(client: CinderlinkClientInterface) {
    this.client = client;
    
    // Bridge social plugin state
    if (client.hasPlugin('socialClient')) {
      const social = client.getPlugin('socialClient');
      
      const postsStore = new UniversalStore([]);
      social.posts.subscribe((posts) => postsStore.set(posts));
      this.stores.set('posts', postsStore);
      
      const usersStore = new UniversalStore([]);
      social.users.subscribe((users) => usersStore.set(users));
      this.stores.set('users', usersStore);
    }
  }
  
  getStore<T>(name: string): UniversalStore<T> | undefined {
    return this.stores.get(name);
  }
}
```

### Swagmi Integration
```typescript
// src/core/adapters/swagmi.ts
export class SwagmiWalletAdapter implements WalletAdapter {
  constructor(private swagmi: SwagmiInstance) {}
  
  async connect(): Promise<{ address: string; signer: any }> {
    await this.swagmi.connect();
    const signer = await fetchSigner();
    const address = await signer.getAddress();
    return { address, signer };
  }
  
  async signMessage(message: string): Promise<string> {
    const signer = await fetchSigner();
    return signer.signMessage(message);
  }
}

// Reactive integration with Svelte 5
export function createSwagmiIdentityStore(swagmi: SwagmiInstance) {
  const adapter = new SwagmiWalletAdapter(swagmi);
  const manager = new UniversalIdentityManager(adapter);
  return createIdentityStore(manager);
}
```

## Bundle Size Optimization

### Tree Shaking Strategy
```typescript
// src/index.ts - Main entry with tree-shakeable exports
export { UniversalIdentityManager } from './core/identity.js';
export { UniversalWalletManager } from './core/wallet.js';
export { SwagmiWalletAdapter } from './core/adapters/swagmi.js';

// Framework-specific exports
export * as Svelte from './svelte/index.js';
export * as React from './react/index.js';
export * as Vue from './vue/index.js';
export * as WebComponents from './web-components/index.js';
```

### Conditional Loading
```typescript
// src/core/framework-detector.ts
export async function createOptimalAdapter(framework?: string) {
  const detected = framework || detectFramework();
  
  switch (detected) {
    case 'svelte':
      const { createIdentityStore } = await import('./svelte/identity.svelte.js');
      return createIdentityStore;
    case 'react':
      const { useIdentity } = await import('./react/hooks.js');
      return useIdentity;
    case 'vue':
      const { useIdentity: vueUseIdentity } = await import('./vue/composables.js');
      return vueUseIdentity;
    default:
      return UniversalIdentityManager;
  }
}
```

## Implementation Timeline

### Phase 1: Core Infrastructure (2 weeks)
- [ ] Framework-agnostic TypeScript core
- [ ] Universal reactive patterns
- [ ] Basic Svelte 5 runes integration
- [ ] Build tooling setup

### Phase 2: Component Library (3 weeks)
- [ ] Identity/wallet management components
- [ ] UI component library
- [ ] Web Components compilation
- [ ] React/Vue adapters

### Phase 3: Documentation Site (2 weeks)
- [ ] SvelteKit documentation site
- [ ] Interactive component playground
- [ ] Framework-specific examples
- [ ] API documentation

### Phase 4: Integration & Testing (1 week)
- [ ] Integration with existing packages
- [ ] Bundle size optimization
- [ ] Cross-framework testing
- [ ] Performance benchmarking

## Success Metrics

### Bundle Size Targets
- **Core Library**: < 3KB gzipped
- **Svelte Components**: < 1.5KB per component
- **Web Components**: < 3KB per component
- **Framework Adapters**: < 1KB each

### Compatibility Goals
- **Svelte 5**: Full runes integration
- **React 18+**: Hooks and Server Components
- **Vue 3**: Composition API integration
- **Web Standards**: Custom Elements v1

### Developer Experience
- **Type Safety**: 100% TypeScript coverage
- **Documentation**: Interactive examples for all components
- **Testing**: Cross-framework compatibility tests
- **Performance**: Bundle size regression tests

This package would serve as the foundation for all future Cinderlink browser-based development while providing a clear migration path for existing applications.