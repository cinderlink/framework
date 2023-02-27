<script lang="ts">
	import { dapp } from '$lib/dapp/store';
	import CreatePost from '$lib/posts/CreatePost.svelte';
	import Post from '$lib/posts/Post.svelte';
	import type { SocialClientPlugin } from '@candor/plugin-social-client';
	import type { SocialPost } from '@candor/plugin-social-core';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	export let data: PageData;

	let posts: SocialPost[] = data.posts;

	const plugin = $dapp.client?.getPlugin('socialClient') as SocialClientPlugin;
	onMount(async () => {
		plugin.table('posts').on('/record/inserted', () => {
			getPosts();
		});
		plugin.table('posts').on('/record/updated', () => {
			getPosts();
		});
		plugin.table('posts').on('/record/deleted', () => {
			getPosts();
		});
	});

	async function getPosts() {
		posts = await plugin
			.table<SocialPost>('posts')
			.query()
			.orderBy('createdAt', 'desc')
			.limit(1000)
			.select()
			.execute()
			.then((res) => res.all());
	}

	$: console.info('posts', posts);
</script>

<div class="p-8 flex flex-col gap-4 flex-1 overflow-auto">
	<CreatePost />
	{#each posts as post}
		<Post {post} />
	{/each}
</div>
