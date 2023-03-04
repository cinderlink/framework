import type { SocialClientPlugin } from '@candor/plugin-social-client';
import type { SocialConnection } from '@candor/plugin-social-core';
import type { PageLoadEvent } from './$types';
import { dapp } from '$lib/dapp/store';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';

export async function load({ params }: PageLoadEvent) {
	const { client } = get(dapp);
	const plugin: SocialClientPlugin | undefined = client?.getPlugin('socialClient');
	let connections: SocialConnection[] | undefined;
	if (client?.id && plugin) {
		connections = await plugin.connections.getConnections(
			client.id,
			params.filter === 'followers' ? 'in' : 'out'
		);
	} else {
		await goto('/connect');
	}
	return { connections, filter: params.filter, localDID: client?.id, plugin };
}
