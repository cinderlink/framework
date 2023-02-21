import {
	fetchEnsName,
	getContract as getWagmiContract,
	getProvider,
	fetchSigner,
	mainnet,
	type Client,
	type Connector,
	type FetchEnsNameResult,
	type Provider
} from '@wagmi/core';
import type { ChainType } from './types';
import { writable, type Writable } from 'svelte/store';

export interface Web3Store {
	address: `0x${string}` | undefined;
	displayName: string | undefined;
	balance: number;
	network: string;
	connected: boolean;
	type: ChainType | undefined;
	walletId: string | undefined;
	evm?: {
		client: Client | undefined;
		connector: Connector | undefined;
		provider: Provider | undefined;
		chainId: number;
	};
	modals: {
		connect: boolean;
	};
}

export const web3: Writable<Web3Store> = writable({
	address: undefined,
	displayName: undefined,
	balance: 0,
	network: 'none',
	connected: false,
	type: undefined,
	walletId: undefined,
	evm: undefined,
	modals: {
		connect: false
	}
} as Web3Store);

web3.subscribe((store) => {
	if (store.address && !store.displayName) {
		if (store.evm?.connector) {
			fetchEnsName({ address: store.address, chainId: mainnet.id }).then(
				(name: FetchEnsNameResult) => setDisplayName(name || undefined)
			);
		} else {
			setDisplayName(undefined);
		}
	}
});

export function setDisplayName(name: string | undefined) {
	web3.update((store) => {
		store.displayName = name || addressDisplayName(store.address);
		return store;
	});
}

export function addressDisplayName(address: string | undefined) {
	return address
		? `${address.slice(0, 6)}...${address.slice(-4)}`
		: `0x${'0'.repeat(4)}...${'0'.repeat(4)}`;
}

export default web3;

export function disconnect() {
	web3.update((store) => {
		store.evm?.connector?.disconnect();
		store.evm?.client?.destroy();
		return store;
	});
	reset();
}

export function getContract(address: string, abi: Record<string, unknown>) {
	return getWagmiContract({ address, abi: abi as any, signerOrProvider: getProvider() });
}

export async function signMessage(message: string) {
	const signer = await fetchSigner();
	return signer?.signMessage(message);
}

export function reset() {
	web3.update((store) => {
		store.address = undefined;
		store.displayName = undefined;
		store.balance = 0;
		store.network = 'none';
		store.connected = false;
		store.type = undefined;
		store.walletId = undefined;
		store.evm = undefined;

		return store;
	});
}
