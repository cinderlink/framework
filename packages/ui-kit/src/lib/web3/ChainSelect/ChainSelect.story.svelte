<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'web3',
		id: 'chain-select',
		title: 'ChainSelect',
		description: 'Select a blockchain network to connect to'
	};
</script>

<script lang="ts">
	import Typography from '$lib/content/Typography/Typography.svelte';
	import ChainSelect from './ChainSelect.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';
</script>

<svelte:head>
	<title>{story.title} - Web3 Components - @candor/ui-kit</title>
</svelte:head>

<Typography>{story.title}</Typography>
<p>{story.description}</p>

<Typography el="h3" classes="mt-6">Example</Typography>
<Panel variant="offset">
	<ChainSelect />
</Panel>
