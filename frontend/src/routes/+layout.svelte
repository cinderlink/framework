<script lang="ts">
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
		</PillMenu>
	</aside>
	<main>
		<div id="actionbar">
			<div id="search">
				<input type="text" placeholder="Search" />
				<button>
					<div class="i-tabler-search" />
				</button>
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
