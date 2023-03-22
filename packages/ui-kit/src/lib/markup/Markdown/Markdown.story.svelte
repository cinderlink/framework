<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';
	import Typography from '../../Typography/Typography.svelte';
	export const story: StoryDef = {
		group: 'content',
		id: 'markdown',
		title: 'Markdown',
		description: 'Markdown component'
	};
</script>

<script lang="ts">
	import Emoji from '../../Emoji/Emoji.svelte';
	import Markdown from './../Markdown.svelte';
	import Panel from '../../Panel/Panel.svelte';
	import List from '$lib/interactive/List/List.svelte';
	import ListItem from '$lib/interactive/List/ListItem.svelte';
	import Button from '$lib/interactive/Button/Button.svelte';
	import Input from '$lib/interactive/Input/Input.svelte';

	let value = '';
	let list: string[] = [];

	function handSubmit(renderedMarkdown: string) {
		list = [...list, renderedMarkdown];
		value = '';
	}
</script>

<svelte:head>
	<title>{story.title} - Content Components - @candor/ui-kit</title>
</svelte:head>

<Typography>{story.title}</Typography>
<div class="story h-full">
	<Markdown bind:value let:renderedMarkdown>
		<Panel>
			<List>
				{#each list as item}
					<ListItem variant="square" classes="flex-col items-start justify-start">
						{@html item}
					</ListItem>
				{/each}
			</List>
		</Panel>
		<div class="h-full">
			<form
				class="h-full flex items-end"
				on:submit|preventDefault={() => handSubmit(renderedMarkdown)}
			>
				<Input id="markdown-input" type="markdown" bind:value />
				<Emoji on:selected={(e) => (value += e.detail)} />
				<Button type="submit">Submit</Button>
			</form>
		</div>
	</Markdown>
</div>
