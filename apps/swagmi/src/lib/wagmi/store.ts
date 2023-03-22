import {
	Client,
	Connector,
	createClient,
	type Chain,
	type ChainProviderFn,
	type Provider,
	type WebSocketProvider
} from '@wagmi/core';
import { writable } from 'svelte/store';

export interface WagmiStore {
	loading: boolean;
	connected: boolean;
	currentChain?: string;
	chains?: Chain[];
	client?: Client<Provider, WebSocketProvider>;
}

export const wagmi = writable<WagmiStore>({
	loading: false,
	connected: false
});

export default wagmi;

export async function load({
	rpc,
	chains,
	connectors
}: {
	rpc?: { http: string; webSocket?: string };
	chains?: Chain[];
	connectors?: Connector[];
} = {}) {
	wagmi.update((w) => {
		w.loading = true;
		return w;
	});
	const { configureChains } = await import('@wagmi/core');
	const providers: ChainProviderFn[] = [];
	let supportedChains: Chain[] = [];
	if (rpc) {
		const { jsonRpcProvider } = await import('@wagmi/core/providers/jsonRpc');
		providers.push(
			jsonRpcProvider({
				rpc: () => rpc
			})
		);
	} else if (import.meta.env.VITE_RPC_URL) {
		const { jsonRpcProvider } = await import('@wagmi/core/providers/jsonRpc');
		providers.push(
			jsonRpcProvider({
				rpc: () => ({
					http: import.meta.env.VITE_RPC_URL,
					webSocket: import.meta.env.VITE_RPC_WS_URL
				})
			})
		);
	} else {
		const { publicProvider } = await import('@wagmi/core/providers/public');
		providers.push(publicProvider());
	}

	if (!chains) {
		supportedChains = await loadDefaultChains();
	}

	if (!connectors) {
		const { InjectedConnector } = await import('@wagmi/core/connectors/injected');
		const { CoinbaseWalletConnector } = await import('@wagmi/core/connectors/coinbaseWallet');
		const { LedgerConnector } = await import('@wagmi/core/connectors/ledger');
		const { MetaMaskConnector } = await import('@wagmi/core/connectors/metaMask');
		const { SafeConnector } = await import('@wagmi/core/connectors/safe');
		const { WalletConnectConnector } = await import('@wagmi/core/connectors/walletConnect');

		connectors = [
			new InjectedConnector(),
			new CoinbaseWalletConnector({
				options: {
					appName: 'swagmi',
					jsonRpcUrl: import.meta.env.VITE_RPC_URL || 'http://localhost:8545'
				}
			}),
			new LedgerConnector(),
			new MetaMaskConnector(),
			new SafeConnector({
				options: {
					allowedDomains: [/localhost:3000$/, /swagmi\.cinderlink\.com$/]
				}
			}),
			new WalletConnectConnector({
				options: {
					projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
				}
			})
		];
	}

	const {
		chains: clientChains,
		provider,
		webSocketProvider
	} = await configureChains(supportedChains, providers);

	const client = createClient<Provider, WebSocketProvider>({
		autoConnect: true,
		provider,
		connectors,
		webSocketProvider
	});

	wagmi.update((current) => ({
		...current,
		loading: false,
		connected: true,
		currentChain: clientChains[0].name,
		chains: clientChains,
		client
	}));
}

export async function loadDefaultChains() {
	const chains = await import('@wagmi/core/chains');
	const defaultChains: Chain[] = [chains.mainnet, chains.polygon, chains.optimism, chains.arbitrum];
	if (import.meta.env.DEV) {
		defaultChains.push(chains.foundry, chains.sepolia, chains.optimismGoerli, chains.baseGoerli);
	}
	return defaultChains;
}

export function disconnect() {
	wagmi.update((w) => {
		w.client?.destroy();
		w.client = undefined;
		w.connected = false;
		return w;
	});
}
