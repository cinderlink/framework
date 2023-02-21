<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';

	export const story: StoryDef = {
		group: 'content',
		id: 'emoji',
		title: 'Emoji',
		description: 'Emoji component'
	};
</script>

<script lang="ts">
	import Input from '$lib/interactive/Input/Input.svelte';
	import Typography from '../Typography/Typography.svelte';

	let inputValue = '';
</script>

<svelte:head>
	<title>{story.title} - Content Components - @candor/ui-kit</title>
</svelte:head>

<Typography>{story.title}</Typography>

<div class="flex h-full justify-end items-end">
	<Input id="emoji-input" type="markdown" bind:value={inputValue} emoji={true} />
</div>
