import { CandorProtocolPlugin } from '@candor/protocol';
import { multiaddr } from '@multiformats/multiaddr';
import type { Contract } from 'ethers';
import { PUBLIC_IPFS_SWARM_ADDRESSES } from '$env/static/public';
import { peerIdFromString } from '@libp2p/peer-id';
import { createSeed, createHash, createClient } from '@candor/client';
import { SocialClientPlugin, type SocialClientEvents } from '@candor/plugin-social-client';
import { OfflineSyncClientPlugin } from '@candor/plugin-offline-sync-client';
import { NotificationClientPlugin } from '@candor/plugin-notification-client';
import { web3, getContract, signMessage } from '@candor/ui-kit';
import { get } from 'svelte/store';
import { UserRegistry } from './contracts';
import dapp from './store';
import type { CandorClientInterface, ProtocolEvents } from '@candor/core-types';
import type { OfflineSyncClientEvents } from '@candor/plugin-offline-sync-core';

export async function initializeDapp(secret: string) {
	console.info('initializing dapp-kit', PUBLIC_IPFS_SWARM_ADDRESSES.split(','));
	const seed = await createSeed(secret);
	const client: CandorClientInterface<any> = await createClient(
		seed,
		PUBLIC_IPFS_SWARM_ADDRESSES.split(',')
	);

	const protocol = new CandorProtocolPlugin(client);
	client.addPlugin<ProtocolEvents>(protocol);
	const social = new SocialClientPlugin(client);
	client.addPlugin<SocialClientEvents>(social);
	const notification = new NotificationClientPlugin(client);
	client.addPlugin(notification);

	const offlineSync = new OfflineSyncClientPlugin(client);
	client.addPlugin<OfflineSyncClientEvents>(offlineSync);

	await client.start();
	await Promise.all(
		PUBLIC_IPFS_SWARM_ADDRESSES.split(',').map(async (addr) => {
			const peerIdStr = addr.split('/').pop();
			console.info('connecting to peer', peerIdStr);
			if (peerIdStr) {
				client.relayAddresses.push(addr);
				const peerId = peerIdFromString(peerIdStr);
				await client.ipfs.libp2p.peerStore.delete(peerId);
				await client.ipfs.swarm.connect(multiaddr(addr));
				await client.connect(peerId, 'server').catch((err: Error) => {
					console.warn(`peer ${peerIdStr} could not be dialed`);
					console.error(err);
				});
			}
		})
	);
	dapp.update((state) => {
		state.client = client;
		state.connected = true;
		return state;
	});
}

export async function signAccountIdentifier(id: string) {
	const { address } = get(web3);
	const hashed = await createHash(id);
	const signed = await signMessage(`Signature request for Candor network
address: ${address}
hash: ${hashed}`);
	return signed;
}

let userRegistry: Contract | undefined;
export function getUserRegistry() {
	if (!userRegistry) {
		userRegistry = getContract(UserRegistry.address, UserRegistry.abi);
	}
	return userRegistry;
}

export async function connect() {
	const { connected: web3connected, address } = get(web3);
	const { connected } = get(dapp);
	if (!web3connected || connected) {
		return;
	}

	let signature: string | undefined = sessionStorage.getItem('candor:signature') || undefined;
	if (address && !signature) {
		signature = await signAccountIdentifier(address);
	}
	if (signature) {
		sessionStorage.setItem('candor:signature', signature);
	} else {
		throw new Error('Could not sign account identifier');
	}
	await initializeDapp(signature);
}

export async function destroy() {
	localStorage.clear();
	// reset indexeddb
	window.indexedDB.deleteDatabase('candor');
	window.indexedDB.deleteDatabase('candor/datastore');
	window.indexedDB.deleteDatabase('candor/blocks');
	window.indexedDB.deleteDatabase('candor/keys');
	window.indexedDB.deleteDatabase('candor/pins');
	window.indexedDB.deleteDatabase('localforage');
}
