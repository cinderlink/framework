<script lang="ts">
	import type { SocialClientPlugin } from '@cryptids/plugin-social-client';
	import cryptids from '$lib/cryptids/store';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	let name = 'guest';
	let avatar = '';
	let plugin: SocialClientPlugin | undefined = undefined;

	onMount(async () => {
		if (!$cryptids.client) {
			goto('/');
			return;
		}

		plugin = $cryptids.client.plugins.socialClient as SocialClientPlugin;

		const user = await $cryptids.client
			?.getSchema('social')
			?.getTable('users')
			?.findByIndex('did', $cryptids.client.id);
		if (user) {
			name = user.name;
			avatar = user.avatar;
		}
	});

	async function onSubmit() {
		if (plugin) {
			await plugin.setState({ name, avatar });
		}
	}
</script>

<h1>Profile</h1>

{#if plugin}
	<form on:submit|preventDefault={onSubmit}>
		<label>
			<span>Name</span>
			<input type="text" bind:value={name} />
		</label>
		<label>
			<span>Avatar</span>
			<input type="text" bind:value={avatar} />
		</label>
		<button type="submit">Save</button>
	</form>
{:else}
	<p>Loading...</p>
{/if}
