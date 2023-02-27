<script lang="ts">
	import dapp from '$lib/dapp/store';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import UserProfile from '$lib/profile/UserProfile.svelte';

	let did: string | undefined = $dapp.client?.id;

	onMount(async () => {
		if (!$dapp.client) {
			goto('/');
			return;
		}
	});
</script>

{#if did !== undefined}
	<UserProfile {did} />
{:else}
	<p>Loading...</p>
{/if}
