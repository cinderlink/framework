<script lang="ts">
	import { onMount } from 'svelte';
	import { web3 } from '@candor/ui-kit/web3';
	import { Logo } from '@candor/ui-kit';
	import { SidebarLayout } from '@candor/ui-kit/layout';
	import type { SocialConnectionRecord } from '@candor/plugin-social-core';
	import type { SocialClientPlugin } from '@candor/plugin-social-client';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { dapp } from '$lib/dapp/store';
	import { profile } from '$lib/profile/store';
	import AppBar from '$lib/components/layout/AppBar.svelte';
	import ConnectionsList from '$lib/social/ConnectionsList.svelte';

	let connections: SocialConnectionRecord[] = [];
	let followerCount = 0;
	let followingCount = 0;
	let plugin: SocialClientPlugin | undefined;

	async function onDataChange() {
		if (plugin && $dapp.client?.id) {
			followerCount = await plugin.connections.getConnectionsCount($dapp.client.id, 'in');
			followingCount = await plugin.connections.getConnectionsCount($dapp.client.id, 'out');
		}
	}

	$: onMount(async () => {
		if (!$web3.connected && !$page.url.pathname.startsWith('/connect')) {
			goto('/connect');
		} else if (!$profile && $page.url.pathname.startsWith('/profile')) {
			goto('/profile');
		}

		if (!$dapp.client) return;
		plugin = $dapp.client?.getPlugin<SocialClientPlugin>('socialClient');
		if (!plugin) return;
		await onDataChange();
		plugin.table('connections').on('/record/inserted', onDataChange);
		plugin.table('connections').on('/record/updated', onDataChange);
		plugin.table('connections').on('/record/deleted', onDataChange);
		plugin.table('connections').on('/block/saved', onDataChange);

		return () => {
			plugin?.table('connections').off('/record/inserted', onDataChange);
			plugin?.table('connections').off('/record/updated', onDataChange);
			plugin?.table('connections').off('/record/deleted', onDataChange);
			plugin?.table('connections').off('/block/saved', onDataChange);
		};
	});

	function savePendingChanges() {
		let unsaved = false;
		for (const schema of Object.values($dapp.client?.schemas || {})) {
			for (const table of Object.values(schema.tables)) {
				if (table.currentBlock.changed) {
					console.info('Saving pending changes to', table.tableId);
					unsaved = true;
				}
			}
		}
		if (unsaved) {
			return Promise.resolve($dapp.client?.save());
		}
	}

	document.body.onmouseleave = () => {
		savePendingChanges();
	};

	window.onbeforeunload = (e) => {
		savePendingChanges();
	};

	window.addEventListener('keydown', (e) => {
		if (e.key === 's' && (navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey)) {
			e.preventDefault();
			savePendingChanges();
		} else if (e.metaKey || e.ctrlKey) {
			// save before they can refresh
			savePendingChanges();
		}
	});

	setInterval(() => {
		savePendingChanges();
	}, 10000);
</script>

<SidebarLayout>
	<svelte:fragment slot="sidebar">
		<a id="brand" href="/">
			<Logo />
			<span>candor.social</span>
		</a>
		{#if $web3.connected}
			<nav id="sidebar-nav">
				<a href="/connections/followers">
					<div class="i-tabler-square-arrow-right" />
					{followerCount} Followers
				</a>
				<a href="/connections/following">
					<div class="i-tabler-square-arrow-left" />
					{followingCount} Following
				</a>
				<a href="/feed">
					<div class="i-tabler-trending-up" />
					Feed
				</a>
				<a href="/profile">
					<div class="i-tabler-user" />
					Profile
				</a>
				<a href="/db">
					<div class="i-tabler-database" />
					Database
				</a>
			</nav>
			<div class="flex-1 flex flex-col h-full items-start justify-start">
				<ConnectionsList did={$dapp.client?.id} direction="mutual" />
			</div>
		{/if}
	</svelte:fragment>
	<main>
		<AppBar />
		<div id="page">
			<slot />
		</div>
	</main>
</SidebarLayout>
