import { writable, get, type Writable } from 'svelte/store';
import type { ContractInterface, Signer, providers, Wallet, ethers } from 'ethers';
import { Contract } from 'ethers';

export interface Web3Store {
	address: string | `0x${string}`;
	displayName: string | undefined;
	avatar: string | undefined;
	chainId: number;
	balance: number;
	network: string;
	connected: boolean;
	walletId?: string;
	provider?: providers.Web3Provider;
	signer?: Signer;
	modals: {
		connect: boolean;
	};
}

export const web3: Writable<Web3Store> = writable({
	address: '',
	displayName: undefined,
	avatar: undefined,
	chainId: 0,
	balance: 0,
	network: 'none',
	connected: false,
	type: undefined,
	modals: {
		connect: false
	}
} as Web3Store);
export default web3;

web3.subscribe((store) => {
	if (store.signer && !store.chainId) {
		store.signer.getChainId().then((chainId) => {
			web3.update((store) => {
				store.chainId = chainId;
				store.connected = true;
				return store;
			});
		});
	}
});

export function setWallet(wallet: Wallet) {
	web3.update((store) => {
		store.address = wallet.address;
		store.displayName = addressDisplayName(store.address);
		store.avatar = undefined;
		store.balance = 0;
		store.provider = (wallet.provider as ethers.providers.Web3Provider) || undefined;
		store.signer = wallet;
		return store;
	});
}

export function setProvider(address: string, provider: providers.Web3Provider) {
	web3.update((store) => {
		store.address = address;
		store.displayName = addressDisplayName(store.address);
		store.avatar = undefined;
		store.balance = 0;
		store.provider = provider;
		store.signer = provider.getSigner();
		return store;
	});
}

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

export function disconnect() {
	web3.update((store) => {
		return store;
	});
	reset();
}

export function getContract(address: string, abi: ContractInterface) {
	const { signer } = get(web3);
	if (!signer) {
		throw new Error('No signer');
	}
	return new Contract(address, abi, signer);
}

export async function signMessage(message: string) {
	const { signer } = get(web3);
	return signer?.signMessage(message);
}

export function reset() {
	web3.update((store) => {
		store.address = '0x0000';
		store.displayName = undefined;
		store.avatar = undefined;
		store.balance = 0;
		store.network = 'none';
		store.connected = false;
		store.walletId = undefined;
		store.provider = undefined;
		store.signer = undefined;

		return store;
	});
}
