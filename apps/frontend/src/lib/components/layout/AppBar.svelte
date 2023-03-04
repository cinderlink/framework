<script lang="ts">
	import { dapp } from '$lib/dapp/store';
	import type { SocialUser } from '@candor/plugin-social-core';
	import type { SocialClientPlugin, SocialClientEvents } from '@candor/plugin-social-client';
	import { Typography } from '@candor/ui-kit/content';
	import { Input, List } from '@candor/ui-kit/interactive';
	import { clickoutside } from '@candor/ui-kit/actions';
	import { slide } from 'svelte/transition';
	import { v4 as uuid } from 'uuid';
	import UserListItem from '$lib/users/UserListItem.svelte';

	let query = '';
	let searchResults: SocialUser[] = [];
	let searched = false;
	let loading = false;
	let error: string | false = false;

	const plugin: SocialClientPlugin | undefined = $dapp.client?.getPlugin(
		'socialClient'
	) as SocialClientPlugin;

	async function searchForUsers() {
		error = false;
		loading = true;
		const requestId: string = uuid();
		const userId = await plugin?.users.getLocalUserId();

		if (!$dapp.client) {
			error = 'Candor network not initialized';
			return;
		}

		if (!plugin) {
			error = 'Social plugin not initialized';
			return;
		}

		searchResults = (await plugin.users.searchUsers(query)).filter(
			(user) => user.did !== $dapp.client?.id
		);
		console.info('search results', searchResults);
		loading = false;
		error = false;

		searched = true;
	}

	export async function connectWithUser(did: string) {
		await plugin?.connections.createConnection(did);
	}

	let resultsVisible = false;
	function onResultsToggle(value: boolean | undefined = undefined) {
		resultsVisible = value === undefined ? !resultsVisible : value;
	}
</script>

<div id="app-bar">
	<div
		id="app-search-container"
		class:active={resultsVisible}
		use:clickoutside
		on:clickoutside={() => {
			onResultsToggle(false);
		}}
	>
		<form id="app-search-form" on:submit|preventDefault={searchForUsers}>
			<Input
				id="app-search-query"
				name="query"
				placeholder="Search"
				bind:value={query}
				on:focus={() => onResultsToggle(true)}
				width="w-full"
			>
				<svelte:fragment slot="prepend">
					<div class="p-2">
						<div class="i-tabler-search text-2xl text-purple-50/60" />
					</div>
				</svelte:fragment>
			</Input>
		</form>
		{#if searched && resultsVisible}
			<div id="app-search-results" transition:slide>
				{#if searchResults?.length}
					<List>
						{#each searchResults as user}
							<UserListItem did={user.did} {user} actions={true} />
						{/each}
					</List>
				{:else if error}
					<Typography el="strong" classes="text-red-500">
						<strong>Error:</strong>
						{error}
					</Typography>
				{:else}
					<Typography el="strong">
						No results found for "{query}"
					</Typography>
				{/if}
			</div>
		{/if}
	</div>

	<div id="app-account" />
</div>

<style>
	#app-bar {
		@apply flex flex-row items-center justify-between w-full gap-2 bg-purple-800 p-2;
	}
	#app-search-container {
		@apply w-full relative box-border bg-purple-800;
	}
	#app-search-container :global(.input__wrapper) {
		@apply bg-purple-50/10 border-2 border-purple-200/30 rounded-lg;
	}
	#app-search-container :global(.input__wrapper input) {
		@apply px-2 text-purple-50 placeholder-purple-50/40;
	}
	#app-account {
		@apply flex items-center justify-end gap-2;
	}
	#app-search-results {
		@apply absolute z-20 border-4 rounded-lg overflow-hidden mt-1 w-full p-2;
		@apply bg-purple-50 border-purple-100;
		@apply dark-(bg-purple-800 border-purple-200/50);
	}
	#app-search-results :global(.panel) {
		@apply rounded-lg;
	}
</style>
