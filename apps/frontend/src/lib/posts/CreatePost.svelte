<script lang="ts">
	import { dapp } from '$lib/dapp/store';
	import type { SocialClientPlugin } from '@candor/plugin-social-client';
	import { Button, Input } from '@candor/ui-kit/interactive';
	import { createEventDispatcher } from 'svelte';

	export let content = '';
	export let saving = false;

	const dispatch = createEventDispatcher();

	async function onSubmit() {
		saving = true;
		const post = (
			(await $dapp.client?.getPlugin('socialClient')) as SocialClientPlugin
		)?.posts.createPost({
			content,
			createdAt: Date.now()
		});
		content = '';
		dispatch('post', post);
		saving = false;
	}
</script>

<div class="post-create__container">
	<form action="" class="post-create__form" on:submit|preventDefault={onSubmit}>
		<Input
			id="post-create-content"
			name="content"
			type="textarea"
			placeholder="What's on your mind?"
			disabled={saving}
			bind:value={content}
		/>
		<div class="flex flex-row w-full items-end justify-end py-2">
			<Button
				disabled={!content.length || saving}
				bg="green-500"
				color="green-900"
				p="x-4 y-2"
				rounded="lg"
				flex="~ row gap-2"
				items="center"
				type="submit"
			>
				{#if saving}
					<div class="i-tabler-loader animate-spin" />
					Saving
				{:else}
					<div class="i-tabler-send" />
					Post
				{/if}
			</Button>
		</div>
	</form>
</div>
