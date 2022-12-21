<script lang="ts">
	import type { SocialUser } from '@cryptids/plugin-social-client';
	import { cryptids } from '$lib/cryptids/store';
	import 'uno.css';
	import '@unocss/reset/tailwind.css';
	import './layout.css';
	import PillMenu from '$lib/components/navigation/PillMenu.svelte';
	import PillMenuItem from '$lib/components/navigation/PillMenuItem.svelte';
	import { onMount } from 'svelte';
	import { initializeCryptids } from '$lib/cryptids/functions';

	onMount(async () => {
		await initializeCryptids('foo bar');
	});

	console.info('adding unload handler');
	window.onbeforeunload = async () => {
		await $cryptids.client?.stop();
	};

	let query = '';
	let searchResults: SocialUser[] = [];
	let searched = false;
	let loading = false;
	async function searchForUsers() {
		loading = true;
		const matches = (await $cryptids.client
			?.getSchema('social')
			?.getTable<SocialUser>('users')
			?.search(query, 10)) as SocialUser[];
		searched = true;
		loading = false;
		searchResults = matches;
	}
</script>

<div id="app">
	<aside id="sidebar">
		<a id="brand" href="/">
			<div class="i-tabler-check text-teal-600" />
			appname
		</a>
		<PillMenu>
			<PillMenuItem href="/followers" icon="i-tabler-square-rounded-arrow-right">
				Followers
			</PillMenuItem>
			<PillMenuItem href="/following" icon="i-tabler-square-rounded-arrow-left">
				Following
			</PillMenuItem>
			<PillMenuItem href="/trending" icon="i-tabler-trending-up">Trending</PillMenuItem>
			<PillMenuItem href="/profile" icon="i-tabler-user">Profile</PillMenuItem>
		</PillMenu>
	</aside>
	<main>
		<div id="actionbar">
			<div id="search">
				<form on:submit|preventDefault={searchForUsers}>
					<input
						type="text"
						placeholder="Search"
						bind:value={query}
						on:input={() => {
							searched = false;
						}}
					/>
					<button type="submit" disabled={loading || searched}>
						<div class={loading ? 'i-tabler-loader animate-spin' : 'i-tabler-search'} />
					</button>
				</form>
				{#if loading || searched}
					<div id="search-results">
						{#if loading}
							<p>loading...</p>
						{:else}
							{#each searchResults as result}
								<pre>{JSON.stringify(result)}</pre>
								<div class="search-result">
									<div class="search-result__avatar">
										<img src={result.avatar} alt={result.name} />
									</div>
									<div class="search-result__name">{result.name}</div>
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
			<button id="profile">
				<div class="user__avatar">
					<div class="i-tabler-user" />
				</div>
				<div class="user__menu-toggle">
					<div class="i-tabler-chevron-down" />
				</div>
			</button>
		</div>
		<div id="page">
			<slot />
		</div>
	</main>
</div>
