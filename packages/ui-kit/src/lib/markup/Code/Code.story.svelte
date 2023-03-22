<script context="module" lang="ts">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'content',
		id: 'code',
		title: 'Code',
		description: 'Code component'
	};
</script>

<script lang="ts">
	import Code from './Code.svelte';
	import Typography from '../../content/Typography/Typography.svelte';
	import Panel from '../../content/Panel/Panel.svelte';
</script>

<Typography>{story.title}</Typography>
<div class="story">
	<Panel>
		<Typography el="h4">Svelte</Typography>
		<Code lang="svelte" code={`<Card title="[title]">[slotted content]</Card>`} />

		<Typography el="h4">Usage</Typography>
		<Code
			lang="svelte"
			code={`<Code lang="svelte" code={\`<Card title="[title]">[slotted content]</Card>\`} />`}
		/>
	</Panel>

	<Panel>
		<Typography el="h4">Javascript</Typography>
		<Code lang="javascript" code={`function add(a, b) { return a + b; }`} />

		<Typography el="h4">Usage</Typography>
		<Code
			lang="svelte"
			code={`<Code lang="javascript" code={\`function add(a, b) { return a + b; }\`} />`}
		/>
	</Panel>

	<Panel>
		<Typography el="h4">Markdown</Typography>
		<Code
			lang="md"
			code={`
:smiley:
**bold**
*italic*
\`\`\`typescript
	function add(a: number, b: number) {
		return a + b;
	}
\`\`\``}
		/>

		<Typography el="h4">Usage</Typography>
		<Code
			lang="svelte"
			code={`<Code lang="md" code={\`
:smiley:
**bold**
*italic*
\`\`\`typescript
	function add(a: number, b: number) {
		return a + b;
	}
\`\`\`
\`} />`}
		/>
	</Panel>
</div>
