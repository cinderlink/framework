<script lang="ts">
	import type { SocialClientEvents, SocialClientPlugin } from '@candor/plugin-social-client';
	import { dapp } from '$lib/dapp/store';
	import { Avatar, Panel, Typography } from '@candor/ui-kit';
	import { formatRelative } from 'date-fns';
	import { onMount } from 'svelte';
	import CidImage from '$lib/dapp/CIDImage.svelte';
	import type { SocialPost, SocialUser } from '@candor/plugin-social-core';

	export let post: SocialPost;
	let plugin: SocialClientPlugin | undefined = undefined;
	let user: SocialUser | undefined = undefined;

	onMount(async () => {
		if (!user) {
			plugin = $dapp.client?.getPlugin<SocialClientEvents, SocialClientPlugin>('socialClient');
			if (plugin) {
				user = await plugin.getUser(post.authorId);
			}
		}
	});
</script>

<Panel size="sm" classes="post">
	<div class="post__header">
		<div class="post__user">
			<Avatar size="sm">
				<svelte:fragment slot="image">
					{#if user?.avatar}
						<CidImage cid={user.avatar} />
					{/if}
				</svelte:fragment>
			</Avatar>
			<Typography el="h3">{user?.name || '(loading)'}</Typography>
		</div>
		<caption>{formatRelative(post.createdAt, Date.now())}</caption>
	</div>
	<div class="post__body">
		<Panel variant="offset" size="sm" classes="post__content">
			<p>{post.content}</p>
		</Panel>
	</div>
	<div class="post__footer" />
</Panel>

<style>
	:global(.panel.post) {
		@apply flex flex-col gap-2 items-center justify-start w-full;
	}
	.post__header {
		@apply flex flex-row items-start justify-between p-4 text-sm w-full;
	}
	.post__header :global(h3.typography) {
		@apply text-lg my-0 p-0 text-purple-600 dark-(text-blue-100) font-700;
	}
	.post__user {
		@apply flex flex-row gap-4 items-center;
	}
	.post__body {
		@apply flex flex-col gap-4 items-center justify-start h-full w-full flex-1 px-8;
	}
	.post__body :global(.panel.post__content) {
		@apply flex flex-col gap-2 items-start justify-start h-full w-full flex-1 p-4;
	}
	.post__footer {
		@apply w-full flex flex-row gap-2 items-center justify-end;
		@apply text-purple-300/60 p-2 text-sm;
	}
</style>
