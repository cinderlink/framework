<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'web3',
		id: 'onboard-connect',
		title: 'Onboard',
		description: 'Web3 Onboard connect'
	};
</script>

<script lang="ts">
	import Syntax from '$lib/content/Syntax/Syntax.svelte';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import Button from '$lib/interactive/Button/Button.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';
	import Onboard from './Onboard.svelte';

	let open = false;
	function onConnect() {
		alert('Connected!');
	}
</script>

<svelte:head>
	<title>Modal - Interactive Components - @candor/ui-kit</title>
</svelte:head>

<Typography>Modal</Typography>

<div class="story">
	<Panel variant="offset">
		<Typography el="h4">Example</Typography>
		<Button on:click={() => (open = true)}>Open Modal</Button>

		<Onboard />

		<Typography el="h4">Usage</Typography>
		<Syntax
			code={`<Button on:click={() => (open = true)}>Open Modal</Button>
<ConnectModal bind:visible={open} on:connect={onConnect} />`}
		/>
	</Panel>
</div>
