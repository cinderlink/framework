<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'web3',
		id: 'wallet-menu',
		title: 'WalletMenu',
		description: 'Active wallet display & dropdown menu'
	};
</script>

<script lang="ts">
	import Typography from '$lib/content/Typography/Typography.svelte';
	import WalletMenu from './WalletMenu.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';
</script>

<svelte:head>
	<title>{story.title} - Web3 Components - @candor/ui-kit</title>
</svelte:head>

<Typography>{story.title}</Typography>
<p>{story.description}</p>

<Typography el="h3" classes="mt-6">Example</Typography>
<div class="story h-full">
	<Panel variant="offset" classes="h-full">
		<WalletMenu />
	</Panel>
</div>
