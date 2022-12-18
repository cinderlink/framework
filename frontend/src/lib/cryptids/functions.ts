import { PUBLIC_IPFS_SWARM_ADDRESSES } from '$env/static/public';
import { createCryptidsSeed, createCryptidsClient } from '@cryptids/client';
import { SocialClientPlugin, type SocialClientEvents } from '@cryptids/plugin-social-client';
import cryptids from './store';

export async function initializeCryptids(secret: string) {
	const seed = await createCryptidsSeed(secret);
	const client = await createCryptidsClient<SocialClientEvents>(
		seed,
		PUBLIC_IPFS_SWARM_ADDRESSES.split(',')
	);
	client.addPlugin(new SocialClientPlugin(client));
	cryptids.update((state) => {
		state.client = client;
		return state;
	});
}
