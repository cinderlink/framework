<script lang="ts">
	import { onMount } from 'svelte';
	import type { SocialClientPlugin } from '@candor/plugin-social-client';
	import type { SocialPost, SocialProfile, SocialUser } from '@candor/plugin-social-core';
	import { Avatar, Typography, ImageUpload } from '@candor/ui-kit';

	import { dapp } from '$lib/dapp/store';
	import Post from '$lib/posts/Post.svelte';
	import CidImage from '$lib/dapp/CIDImage.svelte';
	import CreatePost from '$lib/posts/CreatePost.svelte';

	export let user: SocialUser | undefined = undefined;
	export let did: string | undefined = undefined;

	let profile: SocialProfile | undefined = undefined;
	let posts: SocialPost[] = [];
	let plugin: SocialClientPlugin | undefined = undefined;
	let loading = true;
	$: localUserProfile = user?.did === $dapp.client?.id;
	$: posts = posts ? posts.sort((a, b) => b.createdAt - a.createdAt) : [];

	let avatar: string | undefined = user?.avatar;
	let avatarRef: HTMLInputElement | undefined = undefined;

	onMount(async () => {
		if (!$dapp.client) {
			return;
		}

		plugin = $dapp.client.getPlugin('socialClient') as SocialClientPlugin;
		await updatePosts();
		await updateUser();

		let table = plugin.table('posts');
		table.on('/record/inserted', () => {
			updatePosts();
		});
		table.on('/record/updated', () => {
			updatePosts();
		});
		table.on('/record/deleted', () => {
			updatePosts();
		});

		table = plugin.table('users');
		table.on('/record/updated', () => {
			updateUser();
		});
		table.on('/record/deleted', () => {
			updateUser();
		});
		table.on('/record/inserted', () => {
			updateUser();
		});
	});

	async function updateUser() {
		if (!did && !user?.did) {
			return;
		}
		user = await plugin
			?.table<SocialUser>('users')
			.query()
			.where('did', '=', (user?.did || did) as string)
			.select()
			.execute()
			.then((res) => res.first());
		avatar = user?.avatar;
	}

	async function updatePosts() {
		loading = true;
		if (!did && !user?.did) {
			return [];
		}
		posts =
			(await plugin
				?.table<SocialPost>('posts')
				.query()
				.where('did', '=', (did || user?.did) as string)
				.orderBy('createdAt', 'desc')
				.limit(1000)
				.select()
				.execute()
				.then((res) => res.all())) || [];
		loading = false;
	}

	async function onImageChange(e: CustomEvent<{ files: File[] }>) {
		if (e.detail.files) {
			const addResult = await $dapp.client?.ipfs.add(e.detail.files[0] as Blob, { pin: true });
			if (user && addResult && addResult.cid) {
				await $dapp.client?.ipfs.pin.add(addResult.cid.toString());
				user.avatar = addResult.cid.toString();
				await plugin?.table('users').update(user.id, user);
				// TODO: ask the server to pin
			}
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
				{#if localUserProfile}
					<ImageUpload bind:image={avatar} bind:inputRef={avatarRef} on:change={onImageChange}>
						<svelte:fragment slot="preview">
							<Avatar size="xl">
								<svelte:fragment slot="image">
									<CidImage cid={avatar} />
								</svelte:fragment>
							</Avatar>
						</svelte:fragment>
					</ImageUpload>
				{:else if user?.avatar}
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
		<section class="profile__main" class:animate-pulse={loading}>
			{#if localUserProfile}
				<CreatePost />
			{/if}
			<Typography el="h2" classes="color-purple-500 dark-(color-purple-50) flex items-center gap-2">
				Posts
				{#if loading}
					<div class="i-tabler-loader animate-spin" />
				{/if}
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
