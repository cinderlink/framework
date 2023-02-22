<script lang="ts">
	import { Typography } from '@candor/ui-kit';
	import { List } from '@candor/ui-kit';
	import UserListItem from '$lib/users/UserListItem.svelte';
	import type { PageData } from './$types';
	import type { SocialConnectionRecord } from '@candor/plugin-social-core';
	import { onDestroy, onMount } from 'svelte';

	export let data: PageData;
	let connections: SocialConnectionRecord[] | undefined = data.connections;
	$: filterText = {
		followers: {
			title: 'Followers',
			empty: 'No followers'
		},
		following: {
			title: 'Following',
			empty: 'Not following anyone'
		},
		mutual: {
			title: 'Mutual',
			empty: 'No mutual connections'
		},
		all: {
			title: 'All',
			empty: 'No connections'
		}
	}[data.filter || 'all'];

	onMount(async () => {
		await onDataChange();
	});

	async function onDataChange() {
		connections = await data.plugin?.getConnections(
			data.plugin.client.id,
			data.filter === 'followers' ? 'in' : 'out'
		);
		console.info('connections', connections);
	}

	data.plugin?.table('connections').on('/record/inserted', onDataChange);
	data.plugin?.table('connections').on('/record/updated', onDataChange);
	data.plugin?.table('connections').on('/record/deleted', onDataChange);
	data.plugin?.table('connections').on('/block/saved', onDataChange);

	onDestroy(() => {
		data.plugin?.table('connections').off('/record/inserted', onDataChange);
		data.plugin?.table('connections').off('/record/updated', onDataChange);
		data.plugin?.table('connections').off('/record/deleted', onDataChange);
		data.plugin?.table('connections').off('/block/saved', onDataChange);
	});

	$: connections = data.connections;
</script>

<div class="p-5">
	<Typography el="h1">{filterText?.title}</Typography>
	{#if !connections?.length}
		<Typography el="p">{filterText?.empty}</Typography>
	{:else}
		<List>
			{#each connections as connection}
				<UserListItem
					variant="offset"
					did={connection.to === data.localDID ? connection.from : connection.to}
					size="md"
					actions
				/>
			{/each}
		</List>
	{/if}
</div>
