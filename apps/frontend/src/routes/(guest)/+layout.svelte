<script lang="ts">
	import { profile } from '$lib/profile/store';
	import { goto } from '$app/navigation';
	import { web3 } from '@candor/ui-kit';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { Theme } from '@candor/ui-kit';
	import './layout.css';
	import { LoadingIndicator } from '@candor/ui-kit';
	import { Panel } from '@candor/ui-kit';

	let mounted = false;
	onMount(async () => {
		mounted = true;
		const accountType = localStorage.getItem('candor:accountType');
		if (accountType === 'wallet') {
			return goto('/connect/sign-in/wallet');
		}

		if (accountType === 'key') {
			return goto('/connect/sign-in/key');
		}

		if (localStorage.getItem('candor:hasAccount') === 'true') {
			return goto('/connect/sign-in');
		}

		if (!$web3.connected && !$page.url.pathname.startsWith('/connect')) {
			return goto('/connect');
		}

		if (
			!$profile &&
			!$page.url.pathname.startsWith('/connect') &&
			!$page.url.pathname.startsWith('/connect/register')
		) {
			return goto('/connect/register');
		}
	});
</script>

<Theme>
	<div id="connect">
		<Panel size="lg" classes="w-420px overflow-auto">
			{#if mounted}
				<slot />
			{:else}
				<LoadingIndicator>Loading application state...</LoadingIndicator>
			{/if}
		</Panel>
	</div>
</Theme>

<style>
	#connect {
		@apply w-full h-full;
		@apply flex flex-col items-center justify-center;
	}
</style>
