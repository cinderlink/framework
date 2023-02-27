import type { SocialClientPlugin } from '@candor/plugin-social-client';
import type { SocialPost } from '@candor/plugin-social-core';
import { dapp } from '$lib/dapp/store';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';

export async function load() {
	const { client } = get(dapp);
	const plugin: SocialClientPlugin | undefined = client?.getPlugin(
		'socialClient'
	) as SocialClientPlugin;
	let posts: SocialPost[] = [];
	if (client?.id && plugin) {
		posts = await plugin
			.table<SocialPost>('posts')
			.query()
			.orderBy('createdAt', 'desc')
			.limit(1000)
			.select()
			.execute()
			.then((res) => res.all());
	} else {
		await goto('/connect');
	}
	return { posts };
}
