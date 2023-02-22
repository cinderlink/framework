<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'interactive',
		id: 'title-select',
		title: 'Select',
		description: 'Title select component'
	};
</script>

<script lang="ts">
	import Syntax from '$lib/content/Syntax/Syntax.svelte';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import Select from './Select.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';
	let value = '';
</script>

<svelte:head>
	<title>Select - Interactive Components - @candor/ui-kit</title>
</svelte:head>

<Typography>Select</Typography>

<div class="flex flex-col gap-4">
	<Typography el="h3">Default</Typography>
	<Panel variant="offset">
		<div class="grid grid-cols-2">
			<Typography el="h6">Selected: {value}</Typography>
		</div>
		<Select
			options={[
				{ label: 'Label 1', value: 'value 1' },
				{ label: 'Label 2', value: 'value 2' }
			]}
			bind:value
		/>
	</Panel>
	<Panel variant="offset">
		<Typography el="h4">Usage</Typography>
		<Syntax
			code={`<Select
	options={[
		{ label: 'Label 1', value: 'value 1' },
		{ label: 'Label 2', value: 'value 2' }
	]}
	bind:value
/>`}
		/>
	</Panel>
</div>
