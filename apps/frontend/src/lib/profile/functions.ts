import { get } from 'svelte/store';
import dapp from '$lib/dapp/store';
import type { SocialClientPlugin } from '@candor/plugin-social-client';

export async function loadProfile(id: number) {
	const _dapp = get(dapp);
	if (!_dapp.client || !_dapp.client.hasPlugin('socialClient')) {
		throw new Error('social client plugin not loaded');
	}

	return _dapp.client.getPlugin<SocialClientPlugin>('socialClient')?.getProfile(id);
}
