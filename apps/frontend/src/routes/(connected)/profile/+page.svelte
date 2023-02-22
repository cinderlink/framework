<script lang="ts">
	import type { NotificationClientPlugin } from '@candor/plugin-notification-client';
	import dapp from '$lib/dapp/store';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import UserProfile from '$lib/profile/UserProfile.svelte';
	import type { SocialClientEvents, SocialClientPlugin } from '@candor/plugin-social-client';

	let userId: number | undefined = undefined;

	onMount(async () => {
		if (!$dapp.client) {
			goto('/');
			return;
		}

		const plugin = $dapp.client.getPlugin<SocialClientEvents, SocialClientPlugin>('socialClient');
		userId = await plugin.getLocalUserId();
		// TODO:
		// to be continued...
	});
</script>

{#if userId !== undefined}
	<UserProfile {userId} />
{:else}
	<p>Loading...</p>
{/if}
