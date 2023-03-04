<script lang="ts">
	import { dapp } from '$lib/dapp/store';
	import type { SocialClientPlugin, SocialClientEvents } from '@candor/plugin-social-client';
	import type { SocialConnectionRecord } from '@candor/plugin-social-core';
	import { LoadingIndicator } from '@candor/ui-kit';
	import { List } from '@candor/ui-kit';
	import UserListItem from '$lib/users/UserListItem.svelte';
	import { onMount } from 'svelte';

	export let did: string | undefined;
	export let direction: 'in' | 'out' | 'mutual' | 'all' = 'all';
	export let limit: number = 10;

	let loading = true;
	let connections: SocialConnectionRecord[] = [];
	let plugin: SocialClientPlugin | undefined;

	const onTableChange = async () => {
		if (did && plugin) {
			connections = await plugin.connections.getConnections(did, direction, limit);
		}
	};

	onMount(async () => {
		plugin = $dapp.client?.getPlugin<SocialClientEvents, SocialClientPlugin>('socialClient');

		if (plugin) {
			await onTableChange();
			plugin.table('connections').on('/record/inserted', onTableChange);
			plugin.table('connections').on('/record/updated', onTableChange);
			plugin.table('connections').on('/record/deleted', onTableChange);
			plugin.table('connections').on('/block/saved', onTableChange);
		}

		loading = false;

		return () => {
			if (plugin) {
				plugin.table('connections').off('/record/inserted', onTableChange);
				plugin.table('connections').off('/record/updated', onTableChange);
				plugin.table('connections').off('/record/deleted', onTableChange);
				plugin.table('connections').off('/block/saved', onTableChange);
			}
		};
	});
</script>

{#if loading}
	<LoadingIndicator>loading connections...</LoadingIndicator>
{:else if connections.length}
	<List>
		{#each connections as connection}
			<UserListItem
				href="/chat/{connection.from === did ? connection.to : connection.from}"
				did={connection.from === did ? connection.to : connection.from}
				size="sm"
				actions={false}
			/>
		{/each}
	</List>
{/if}
