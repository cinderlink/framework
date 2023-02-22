<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'content',
		id: 'avatar',
		title: 'Avatar',
		description: 'Avatar component'
	};
</script>

<script lang="ts">
	import Avatar from './Avatar.svelte';
	import Syntax from '../Syntax/Syntax.svelte';
	import Typography from '../Typography/Typography.svelte';
	import Input from '$lib/interactive/Input/Input.svelte';
	import Select from '$lib/interactive/Select/Select.svelte';
	import Panel from '../Panel/Panel.svelte';

	let image = 'https://loremflickr.com/640/360';
	let size: 'md' | 'sm' | 'lg' = 'md';
	let badge = false;
	let status: 'online' | 'offline' | 'busy' | 'away' | undefined = undefined;
</script>

<svelte:head>
	<title>{story.title} - Content Components - @candor/ui-kit</title>
</svelte:head>

<Typography>{story.title}</Typography>
<p>{story.description}</p>

<div class="story">
	<Panel variant="offset">
		<Typography el="h2">Preview</Typography>
		<Avatar bind:image bind:size bind:status />
	</Panel>

	<div class="flex gap-2">
		<Panel variant="offset" classes="flex flex-col gap-2 w-1/2">
			<Typography el="h2">Props</Typography>
			<Input id="image" label="image" placeholder="https://..." bind:value={image} />
			<Select
				id="size"
				label="size"
				bind:value={size}
				options={[
					{ value: 'md', label: 'md' },
					{ value: 'sm', label: 'sm' },
					{ value: 'lg', label: 'lg' }
				]}
			/>
			<Select
				id="status"
				label="status"
				bind:value={status}
				options={[
					{ value: 'online', label: 'online' },
					{ value: 'offline', label: 'offline' },
					{ value: 'busy', label: 'busy' },
					{ value: 'away', label: 'away' }
				]}
			/>
			<Select
				id="badge"
				label="badge"
				bind:value={badge}
				options={[
					{ value: false, label: 'false' },
					{ value: true, label: 'true' }
				]}
			/>
		</Panel>
		<Panel variant="offset" classes="w-1/2">
			<Typography el="h2">Code</Typography>
			<Syntax code={`<Avatar image="{image}" size="{size}" />`} />
		</Panel>
	</div>
</div>
