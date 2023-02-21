<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'web3',
		id: 'wallet-select',
		title: 'WalletSelect',
		description: 'Select a blockchain wallet to connect with'
	};
</script>

<script lang="ts">
	import Typography from '$lib/content/Typography/Typography.svelte';
	import WalletSelect from './WalletSelect.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';
</script>

<svelte:head>
	<title>{story.title} - Web3 Components - @candor/ui-kit</title>
</svelte:head>

<Typography>{story.title}</Typography>
<p>{story.description}</p>

<Typography el="h3" classes="mt-6">Example</Typography>
<div class="story">
	<Panel variant="offset">
		<WalletSelect />
	</Panel>
</div>
