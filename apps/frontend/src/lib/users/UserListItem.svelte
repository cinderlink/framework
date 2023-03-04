<script lang="ts">
	import type { SocialClientEvents, SocialClientPlugin } from '@candor/plugin-social-client';
	import type { SocialUser } from '@candor/plugin-social-core';
	import { Avatar, Panel, Button, OnlineStatusIndicator } from '@candor/ui-kit';
	import CidImage from '$lib/dapp/CIDImage.svelte';
	import { onMount } from 'svelte';
	import { dapp } from '$lib/dapp/store';

	export let user: SocialUser | undefined = undefined;
	export let did: string | undefined = user?.did;
	export let actions = false;
	export let size: 'sm' | 'md' | 'lg' = 'sm';
	export let href: string | undefined = undefined;
	export let connectionState: 'in' | 'out' | 'mutual' | 'none' | undefined = undefined;

	let loading = true;

	onMount(async () => {
		if (did && (!user || !connectionState)) {
			const plugin: SocialClientPlugin | undefined = $dapp.client?.getPlugin<
				SocialClientEvents,
				SocialClientPlugin
			>('socialClient');
			if (plugin) {
				if (!user) {
					user = await plugin.users.getUserByDID(did);
					console.info('user', user);
				}
				if (!connectionState) {
					console.info('fetching connection state', did);
					connectionState = await plugin.connections.getConnectionDirection(did);
					console.info('connection state', connectionState);
				}
			} else {
				console.error('plugin not found');
			}
		}
		loading = false;
	});

	async function follow() {
		const plugin: SocialClientPlugin | undefined = $dapp.client?.getPlugin<
			SocialClientEvents,
			SocialClientPlugin
		>('socialClient');
		if (plugin && did) {
			await plugin.connections.createConnection(did);
			connectionState = await plugin.connections.getConnectionDirection(did);
		}
	}

	async function unfollow() {
		const plugin: SocialClientPlugin | undefined = $dapp.client?.getPlugin<
			SocialClientEvents,
			SocialClientPlugin
		>('socialClient');
		if (plugin && did && $dapp.client?.id) {
			await plugin.connections.deleteConnection($dapp.client.id, did);
			connectionState = await plugin.connections.getConnectionDirection(did);
		}
	}
</script>

{#if !loading && user}
	<Panel {...$$restProps} {href} flex="flex flex-row gap-6 items-center" size="sm">
		<div class="user-list-item__avatar">
			<Avatar {size} status={user.status}>
				<svelte:fragment slot="image">
					<CidImage cid={user.avatar} />
				</svelte:fragment>
			</Avatar>
		</div>

		<div class="user-list-item__name user-list-item__name--{size}">
			<h4>{user.name}</h4>
			<OnlineStatusIndicator status={user.status} />
		</div>

		{#if actions}
			<div class="user-list-item__actions">
				{#if connectionState === 'none'}
					<span class="user-list-item__connection">not connected to {user.name}</span>
					<Button variant="blue" {size} on:click={() => follow()}>
						{#if loading}
							<div class="i-tabler-loader animate-spin" />
						{:else}
							<div class="i-tabler-user-plus" />
						{/if}
						Follow
					</Button>
				{:else if connectionState === 'in'}
					<span class="user-list-item__connection">{user.name} follows you</span>
					<Button variant="blue" {size} on:click={() => follow()}>
						{#if loading}
							<div class="i-tabler-loader animate-spin" />
						{:else}
							<div class="i-tabler-user-plus" />
						{/if}
						Follow Back
					</Button>
				{:else if connectionState === 'out'}
					<span class="user-list-item__connection">you follow {user.name}</span>
					<Button variant="red" {size} on:click={() => unfollow()}>
						{#if loading}
							<div class="i-tabler-loader animate-spin" />
						{:else}
							<div class="i-tabler-user-minus" />
						{/if}
						Unfollow
					</Button>
				{:else if connectionState === 'mutual'}
					<span class="user-list-item__connection">you and {user.name} follow eachother</span>
					<Button variant="red" {size} on:click={() => unfollow()}>
						{#if loading}
							<div class="i-tabler-loader animate-spin" />
						{:else}
							<div class="i-tabler-user-minus" />
						{/if}
						Unfollow
					</Button>
					<Button variant="green" {size} href="/chat/{user.did}">
						<div class="i-tabler-message" />
						Message
					</Button>
					<Button variant="blue" {size} href="/profile/{user.did}">
						<div class="i-tabler-user" />
						Profile
					</Button>
				{/if}
			</div>
		{/if}
	</Panel>
{/if}

<style>
	.user-list-item__avatar {
		@apply flex-shrink-0;
	}
	.user-list-item__name {
		@apply flex-1 flex flex-col gap-1;
	}
	.user-list-item__actions {
		@apply flex flex-row gap-2 items-center;
	}

	.user-list-item__name--sm {
		@apply text-lg;
	}
	.user-list-item__name--md {
		@apply text-xl;
	}
	.user-list-item__name--lg {
		@apply text-4xl;
	}

	.user-list-item__connection {
		@apply mr-4 text-md text-purple-100 dark-(text-purple-300);
	}
</style>
