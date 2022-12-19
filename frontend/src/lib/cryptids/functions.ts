import { PUBLIC_IPFS_SWARM_ADDRESSES } from '$env/static/public';
import { peerIdFromString } from '@libp2p/peer-id';
import { createCryptidsSeed, createCryptidsClient } from '@cryptids/client';
import { SocialClientPlugin, type SocialClientEvents } from '@cryptids/plugin-social-client';
import cryptids from './store';

export async function initializeCryptids(secret: string) {
	console.info('initializing cryptids', PUBLIC_IPFS_SWARM_ADDRESSES.split(','));
	const seed = await createCryptidsSeed(secret);
	const client = await createCryptidsClient<SocialClientEvents>(
		seed,
		PUBLIC_IPFS_SWARM_ADDRESSES.split(',')
	);

	client.addPlugin(new SocialClientPlugin(client));
	await client.start();
	await Promise.all(
		PUBLIC_IPFS_SWARM_ADDRESSES.split(',').map(async (addr) => {
			const peerIdStr = addr.split('/').pop();
			console.info('connecting to peer', peerIdStr);
			if (peerIdStr) {
				const peerId = peerIdFromString(peerIdStr);
				await client.connect(peerId);
			}
		})
	);
	cryptids.update((state) => {
		state.client = client;
		return state;
	});
}
