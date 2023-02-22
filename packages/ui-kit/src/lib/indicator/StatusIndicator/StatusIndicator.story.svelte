<script context="module" lang="ts">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'indicator',
		id: 'status',
		title: 'Status',
		description: 'Status indicator component'
	};
</script>

<script lang="ts">
	import Syntax from '$lib/content/Syntax/Syntax.svelte';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import StatusIndicator from './StatusIndicator.svelte';
	import type { Size } from '$lib/theme/types';
	import Select from '$lib/interactive/Select/Select.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';

	export const statusProps: {
		size: Size;
		status: 'success' | 'warning' | 'error' | 'info';
	} = {
		size: 'md',
		status: 'success'
	};
</script>

<svelte:head>
	<title>Status - Indicator Components - @candor/ui-kit</title>
</svelte:head>

<Typography>Status</Typography>

<div class="flex flex-col gap-4">
	<Panel variant="offset">
		<div class="flex flex-row">
			<Select
				label="Size"
				options={[
					{ value: 'xs', label: 'xs' },
					{ value: 'sm', label: 'sm' },
					{ value: 'md', label: 'md' },
					{ value: 'lg', label: 'lg' },
					{ value: 'xl', label: 'xl' }
				]}
				bind:value={statusProps.size}
			/>
			<Select
				label="Status"
				options={[
					{ value: 'success', label: 'success' },
					{ value: 'warning', label: 'warning' },
					{ value: 'error', label: 'error' },
					{ value: 'info', label: 'info' }
				]}
				bind:value={statusProps.status}
			/>
		</div>
	</Panel>
	<Panel variant="offset">
		<Typography el="h3">Default</Typography>
		<StatusIndicator {...statusProps} />
	</Panel>
	<Panel variant="offset">
		<Typography el="h4">Usage</Typography>
		<Syntax code={`<StatusIndicator />`} />
	</Panel>
</div>
