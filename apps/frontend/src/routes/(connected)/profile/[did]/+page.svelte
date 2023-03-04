<script lang="ts">
	import dapp from '$lib/dapp/store';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import UserProfile from '$lib/profile/UserProfile.svelte';
	import type { SocialClientEvents, SocialClientPlugin } from '@candor/plugin-social-client';
	import { page } from '$app/stores';
	import type { SocialUser } from '@candor/plugin-social-core';

	const did = $page.params.did;
	let user: SocialUser | undefined = undefined;

	onMount(async () => {
		if (!$dapp.client) {
			goto('/');
			return;
		}

		const plugin = $dapp.client.getPlugin<SocialClientEvents, SocialClientPlugin>('socialClient');
		user = await plugin.users.getUserByDID(did);
		console.info('user', user);
	});
</script>

{#if user !== undefined}
	<UserProfile {user} />
{:else}
	<p>Loading...</p>
{/if}
