<script lang="ts" context="module">
	import Panel from '$lib/content/Panel/Panel.svelte';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'layout',
		id: 'sidebar',
		title: 'Sidebar',
		description: 'Sidebar component'
	};
</script>

<script lang="ts">
	import Sidebar from './Sidebar.svelte';
</script>

<svelte:head>
	<title>Sidebar - Layout Components - @candor/ui-kit</title>
</svelte:head>

<Typography>Sidebar</Typography>

<div class="story">
	<Panel variant="offset">
		<Typography el="h3">Preview</Typography>
		<div>
			<Sidebar>
				<Typography>Sidebar title</Typography>
				<Typography el="p">Sidebar content</Typography>
			</Sidebar>
		</div>
	</Panel>
</div>
