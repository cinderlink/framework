<script context="module" lang="ts">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'interactive',
		id: 'toggle',
		title: 'Toggle',
		description: 'Toggle component'
	};
</script>

<script lang="ts">
	import Syntax from '$lib/content/Syntax/Syntax.svelte';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import Toggle from './Toggle.svelte';
	import type { Size } from '$lib/theme/types';
	import Select from '../Select/Select.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';
	let size: Size = 'md';
	let toggled = false;
	let disableToggle = false;
</script>

<svelte:head>
	<title>Toggle - Interactive Components - @candor/ui-kit</title>
</svelte:head>

<div class="story">
	<Panel variant="offset">
		<Toggle id="1" bind:toggled bind:size disabled={disableToggle}>
			<div slot="label">Toggle label</div>
		</Toggle>
	</Panel>
	<br />
	<Panel variant="offset">
		<div class="grid grid-cols-3 items-center gap-2">
			<Typography el="p">Status: {toggled ? 'On' : 'Off (default)'}</Typography>
			<Toggle id="2" bind:toggled={disableToggle}>
				<div slot="label">Disable</div>
			</Toggle>
			<Select
				label="Size"
				options={[
					{ value: 'xs', label: 'xs' },
					{ value: 'sm', label: 'sm' },
					{ value: 'md', label: 'md' },
					{ value: 'lg', label: 'lg' },
					{ value: 'xl', label: 'xl' },
					{ value: '2xl', label: '2xl' }
				]}
				bind:value={size}
			/>
		</div>
	</Panel>

	<br />
	<Panel variant="offset">
		<Typography el="h4">Usage</Typography>
		<Syntax
			code={`<Toggle id="1" bind:toggled bind:size disabled={disableToggle}>
	<div slot="label">Toggle label</div>
</Toggle>`}
		/>
	</Panel>
</div>
