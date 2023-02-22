<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'content',
		id: 'card',
		title: 'Card',
		description: 'Card component'
	};
</script>

<script lang="ts">
	import Card from '../Card/Card.svelte';
	import Panel from '../Panel/Panel.svelte';
	import Syntax from '../Syntax/Syntax.svelte';
	import Typography from '../Typography/Typography.svelte';
</script>

<svelte:head>
	<title>{story.title} - Content Components - @candor/ui-kit</title>
</svelte:head>

<Typography>{story.title}</Typography>
<p>{story.description}</p>

<div class="story">
	<Panel variant="offset">
		<Typography el="h3">Default Card</Typography>
		<Card title="[title]">[slotted content]</Card>
		<Typography el="h4">Usage</Typography>
		<Syntax code={`<Card title="[title]">[slotted content]</Card>`} />
	</Panel>
	<Panel variant="offset">
		<Typography el="h3">Outlined Card</Typography>
		<Card title="[title]" variant="outlined" color="neutral">[slotted content]</Card>
		<Typography el="h4">Usage</Typography>
		<Syntax code={`<Card variant="primary">[slotted content]</Card>`} />
	</Panel>
	<Panel variant="offset">
		<Typography el="h3">Secondary Card</Typography>
		<Card title="[title]" variant="secondary">[slotted content]</Card>
		<Typography el="h4">Usage</Typography>
		<Syntax code={`<Card variant="secondary">[slotted content]</Card>`} />
	</Panel>
	<Panel variant="offset">
		<Typography el="h3">Content Alignment</Typography>
		<Card title="[title]" align="items-start">[slotted content]</Card>
		<Typography el="h4">Usage</Typography>
		<Syntax code={`<Card align="items-start">[slotted content]</Card>`} />
	</Panel>
</div>
