import type { SocialClientPlugin } from '@candor/plugin-social-client';
import type { SocialUser, SocialChatMessage } from '@candor/plugin-social-core';
import type { PageLoadEvent } from './$types';
import { dapp } from '$lib/dapp/store';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';

export async function load({ params }: PageLoadEvent) {
	const { did } = params;
	const { client } = get(dapp);
	const plugin: SocialClientPlugin | undefined = client?.getPlugin('socialClient') as
		| SocialClientPlugin
		| undefined;
	let messages: SocialChatMessage[] = [];
	let user: SocialUser | undefined;
	if (client?.id && plugin) {
		user = await plugin.users.getUserByDID(did);
		messages = await plugin
			.table<SocialChatMessage>('chat_messages')
			.query()
			.where('to', 'in', [client?.id, did])
			.where('from', 'in', [did, client?.id])
			.select()
			.orderBy('createdAt', 'desc')
			.limit(1000)
			.execute()
			.then((res) => res.all());
		console.info('messages', messages);
	} else {
		await goto('/connect');
	}
	return { user, messages };
}
