<script lang="ts">
	import { onMount } from 'svelte';
	import type { SocialClientEvents, SocialClientPlugin } from '@candor/plugin-social-client';
	import type { SocialPost, SocialProfile, SocialUser } from '@candor/plugin-social-core';
	import { Avatar, Typography } from '@candor/ui-kit';

	import { dapp } from '$lib/dapp/store';
	import Post from '$lib/posts/Post.svelte';
	import CidImage from '$lib/dapp/CIDImage.svelte';
	import CreatePost from '$lib/posts/CreatePost.svelte';

	export let userId: number | undefined = undefined;
	export let user: SocialUser | undefined = undefined;
	let profile: SocialProfile | undefined = undefined;
	let posts: SocialPost[] = [];
	let plugin: SocialClientPlugin | undefined = undefined;
	let loading = true;

	$: posts = posts ? posts.sort((a, b) => b.createdAt - a.createdAt) : [];

	onMount(async () => {
		if (!$dapp.client) {
			return;
		}

		plugin = $dapp.client.getPlugin<SocialClientEvents, SocialClientPlugin>('socialClient');
		if (userId !== undefined || user !== undefined) {
			updateUserData();
		}
	});

	async function updateUserData() {
		if (plugin) {
			loading = true;
			if (!user && userId !== undefined) {
				user = await plugin?.getUser(userId);
			}
			if (user && user.did !== $dapp.client?.id) {
				const peer = $dapp.client?.peers.getPeerByDID(user.did);
				if (peer) {
					// ask the peer for posts
					console.info('asking peer for posts', peer);
					const received = await $dapp.client?.request(peer.peerId.toString(), {
						topic: '/social/updates/request',
						data: {
							author: user.did,
							since: 0
						}
					});
					console.info(
						`received ${received?.data.updates.length} posts from peer ${peer.peerId.toString()}`,
						received
					);
					for (const postData of received?.data.updates || []) {
						const { id, ...post } = postData;
						const authorId = (await plugin?.getUserByDID(post.author))?.id;
						if (authorId) {
							console.info(`saving post ${id} by ${authorId}`, post);
							await plugin?.table<SocialPost>('posts').insert({
								...post,
								authorId
							});
						} else {
							console.warn(`could not find author ${post.author} for post ${id}`);
						}
					}
				}

				// let's ask the server for posts
				const server = $dapp.client?.peers.getServers()[0];
				if (server) {
					console.info('asking server for posts', server);
					const received = await $dapp.client?.request(server.peerId.toString(), {
						topic: '/social/updates/request',
						data: {
							author: user.did,
							since: 0
						}
					});
					console.info(
						`received ${
							received?.data.updates.length
						} posts from server ${server.peerId.toString()}`,
						received
					);
					if (received?.data.updates.length) {
						// we have 'new' posts, let's save them
						for (const postData of received.data.updates) {
							const { id, ...post } = postData;
							const authorId = (await plugin?.getUserByDID(post.author))?.id;
							if (authorId) {
								console.info(`saving post ${id} by ${authorId}`, post);
								await plugin?.table<SocialPost>('posts').insert({
									...post,
									authorId
								});
							} else {
								console.warn(`could not find author ${post.author} for post ${id}`);
							}
						}
					}
				}
			}
			const uid = userId || user?.id;
			if (uid) {
				profile = await plugin?.getUserProfile(uid);
				posts = await plugin?.getUserPosts(uid);
			}
			loading = false;
		}
	}
</script>

<div class="profile__container">
	<div class="profile__hero">
		<div class="profile__banner">
			{#if profile?.banner}
				<img src={profile.banner} alt="{user?.name || ''} profile banner image" />
			{/if}
		</div>
		<section class="flex flex-row gap-8 items-center">
			<div class="profile__avatar">
				{#if user?.avatar}
					<Avatar>
						<svelte:fragment slot="image">
							<CidImage cid={user.avatar} />
						</svelte:fragment>
					</Avatar>
				{/if}
			</div>
			<div class="profile__name">
				{user?.name || ''}
			</div>
		</section>
	</div>
	<div class="profile__body">
		<!-- <aside class="profile__sidebar">
			<div class="profile__bio">
				{user?.bio || ''}
			</div>
			<div class="profile__connections">
				<Typography el="h3" classes="text-purple-500 dark-(text-purple-200)">Connections</Typography
				>
				{#if profile?.favoriteConnections}
					{#each profile?.favoriteConnections as connection}
					{/each}
				{/if}
			</div>
		</aside> -->
		<section class="profile__main">
			{#if user?.did === $dapp.client?.did.id}
				<CreatePost on:post={updateUserData} />
			{/if}
			<Typography el="h2" classes="color-purple-500 dark-(color-purple-50)">
				{#if loading}
					<div class="i-tabler-loader animate-spin" />
				{/if}
				Posts
			</Typography>
			{#if profile?.favoritePosts}
				<div class="profile__posts profile__posts--favorited">Favorite posts</div>
			{/if}
			<div class="profile__posts">
				{#if posts?.length}
					{#each posts as post}
						<Post {post} />
					{/each}
				{:else}
					<Typography el="p"
						>{user?.did === $dapp.client?.id ? "You haven't" : `${user?.name || 'User'} hasn't`} posted
						anything yet!</Typography
					>
				{/if}
			</div>
		</section>
	</div>
</div>

<style>
	.profile__container {
		@apply flex-1 flex flex-col h-full w-full;
	}
	.profile__hero {
		@apply flex flex-row items-center gap-2 min-h-180px relative text-white border-b-2 border-purple-100;
		@apply bg-gradient-to-b from-purple-800 to-purple-700;
		@apply dark-(bg-gradient-to-b from-purple-800 to-purple-700 border-purple-700/30);
		@apply shadow-xl p-8 gap-8 justify-between;
	}
	.profile__banner {
		@apply w-full h-60px absolute top-0 left-0;
	}
	.profile__name {
		@apply text-5xl text-shadow-md font-bold;
	}
	.profile__avatar {
	}
	.profile__avatar :global(.avatar) {
		@apply shadow-md border-4 border-purple-600;
	}
	.profile__body {
		@apply flex-1 w-full h-full flex flex-row gap-2 overflow-hidden;
	}
	.profile__posts {
		@apply flex flex-col gap-2;
	}
	.profile__main {
		@apply w-full h-full p-8 bg-purple-50/5 overflow-auto;
	}
</style>
