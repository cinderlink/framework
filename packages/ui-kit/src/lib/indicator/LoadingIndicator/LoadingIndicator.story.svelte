<script context="module" lang="ts">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'indicator',
		id: 'loading',
		title: 'Loading',
		description: 'Loading indicator component'
	};
</script>

<script lang="ts">
	import Syntax from '$lib/content/Syntax/Syntax.svelte';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import LoadingIndicator from './LoadingIndicator.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';
</script>

<svelte:head>
	<title>Loading - Indicator Components - @candor/ui-kit</title>
</svelte:head>

<Typography>Loading</Typography>

<div class="flex flex-col gap-4">
	<Panel variant="offset">
		<Typography el="h3">Default</Typography>
		<LoadingIndicator />
	</Panel>
	<Panel variant="offset">
		<Typography el="h4">Usage</Typography>
		<Syntax code={`<LoadingIndicator />`} />
	</Panel>
</div>
