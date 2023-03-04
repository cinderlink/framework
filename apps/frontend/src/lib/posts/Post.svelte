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

	$: if (plugin && post.did) {
		plugin.users.getUserByDID(post.did).then((usr) => {
			user = usr;
		});
	}

	onMount(async () => {
		if (!user) {
			plugin = $dapp.client?.getPlugin('socialClient') as SocialClientPlugin;
		}
	});
</script>

<Panel size="sm" classes="post" variant="offset">
	<div class="post__header">
		<div class="post__user">
			{#key user}
				<Avatar size="sm">
					<svelte:fragment slot="image">
						{#if user?.avatar}
							<CidImage cid={user.avatar} />
						{/if}
					</svelte:fragment>
				</Avatar>
				<Typography el="h3">{user?.name || '(loading)'}</Typography>
			{/key}
		</div>
		<caption class="px-2 text-purple-200">{formatRelative(post.createdAt, Date.now())}</caption>
	</div>
	<div class="post__body">
		<Panel size="sm" classes="post__content">
			<p>{post.content}</p>
		</Panel>
	</div>
</Panel>

<style>
	:global(.panel.post) {
		@apply flex flex-col gap-2 items-center justify-start w-full px-2 py-4;
	}
	.post__header {
		@apply flex flex-row items-start justify-between p-2 text-sm w-full;
	}
	.post__header :global(h3.typography) {
		@apply text-lg my-0 p-0 text-purple-600 dark-(text-blue-100) font-700;
	}
	.post__user {
		@apply flex flex-row gap-4 items-center;
	}
	.post__body {
		@apply flex flex-col gap-4 items-center justify-start h-full w-full flex-1 px-2;
	}
	.post__body :global(.panel.post__content) {
		@apply flex flex-col gap-2 items-start justify-start h-full w-full flex-1 p-4;
	}
	.post__footer {
		@apply w-full flex flex-row gap-2 items-center justify-end;
		@apply text-purple-300/60 p-2 text-sm;
	}
</style>
