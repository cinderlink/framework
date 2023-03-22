<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';
	import Panel from '../Panel/Panel.svelte';
	export const story: StoryDef = {
		group: 'content',
		id: 'syntax',
		title: 'Syntax',
		description: 'Syntax highlighting component'
	};
</script>

<script lang="ts">
	import Syntax from '../Syntax/Syntax.svelte';
	import Typography from '../Typography/Typography.svelte';
</script>

<svelte:head>
	<title>Syntax - Content Components - @candor/ui-kit</title>
</svelte:head>

<Typography>Syntax</Typography>

<div class="story">
	<Panel>
		<Typography el="h3">Example</Typography>
		<Syntax language="svelte" code={`<Card title="[title]">[slotted content]</Card>`} />
		<Typography el="h4">Usage</Typography>
		<Syntax
			code={`<Syntax
	language="svelte"
	code={\`
		<Card title="[title]">[slotted content]</Card>
		\`}
			let:renderedMarkdown
		>
	{@html renderedMarkdown}
</Syntax>
		`}
		/>
	</Panel>
</div>
