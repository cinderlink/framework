import type { DID } from 'dids';
import type { Contract } from 'ethers';
import type { Options } from 'ipfs-core';
import { multiaddr } from '@multiformats/multiaddr';
import { get } from 'svelte/store';
import { PUBLIC_IPFS_SWARM_ADDRESSES } from '$env/static/public';
import { peerIdFromString } from '@libp2p/peer-id';

import { SyncDBPlugin } from '@candor/plugin-sync-db';
import { CandorProtocolPlugin } from '@candor/protocol';
import { createClient } from '@candor/client';
import { SocialClientPlugin } from '@candor/plugin-social-client';
import { OfflineSyncClientPlugin } from '@candor/plugin-offline-sync-client';
import { NotificationClientPlugin } from '@candor/plugin-notification-client';
import { web3, getContract, signMessage } from '@candor/ui-kit';

import { UserRegistry } from './contracts';
import dapp from './store';
import type { SyncPluginEvents, CandorClientInterface, ProtocolEvents } from '@candor/core-types';
import type { OfflineSyncClientEvents } from '@candor/plugin-offline-sync-core';
import {
	createDID,
	createHash,
	createSeed,
	createSignerDID,
	signAddressVerification
} from '@candor/identifiers';
import { SocialSyncConfig, type SocialClientEvents } from '@candor/plugin-social-core';

export async function initializeDapp(
	did: DID,
	address: string,
	addressVerification: string,
	options?: Partial<Options>
) {
	const client: CandorClientInterface<any> = await createClient({
		did,
		address,
		addressVerification,
		nodes: PUBLIC_IPFS_SWARM_ADDRESSES.split(','),
		options
	});

	const protocol = new CandorProtocolPlugin(client);
	client.addPlugin<ProtocolEvents>(protocol);
	const social = new SocialClientPlugin(client);
	client.addPlugin<SocialClientEvents>(social);
	const notification = new NotificationClientPlugin(client);
	client.addPlugin(notification);
	const offlineSync = new OfflineSyncClientPlugin(client);
	client.addPlugin<OfflineSyncClientEvents>(offlineSync);

	console.info('creating sync db plugin');
	const syncDb = new SyncDBPlugin(client, {
		schemas: {
			...SocialSyncConfig
		}
	});
	console.info('sync db', syncDb);
	client.addPlugin<SyncPluginEvents>(syncDb as any);

	await client.start();
	Promise.all(
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

export async function connect(nonce = 0) {
	const { connected: web3connected, signer } = get(web3);
	const { connected } = get(dapp);
	if (!web3connected || connected) {
		return;
	}

	if (!signer) {
		throw new Error('No signer found');
	}

	let did: DID | undefined = undefined;
	let addressVerification: string | undefined =
		sessionStorage.getItem('candor:addressVerification') || undefined;
	const entropy: string | undefined = sessionStorage.getItem('candor:entropy') || undefined;

	if (entropy) {
		const seed = await createSeed(entropy);
		did = await createDID(seed);
	} else {
		did = await createSignerDID('candor.social', signer, nonce);
	}

	if (!did) {
		throw new Error('Could not create or restore DID');
	}

	const address = await signer.getAddress();
	if (!addressVerification) {
		addressVerification = await signAddressVerification('candor.social', did.id, signer);
		sessionStorage.setItem('candor:addressVerification', addressVerification);
	}

	await initializeDapp(did, address, addressVerification);
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
