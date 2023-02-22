<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'interactive',
		id: 'input',
		title: 'Input',
		description: 'Input component (text, password, number, email)'
	};
</script>

<script lang="ts">
	import Syntax from '$lib/content/Syntax/Syntax.svelte';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import Input from './Input.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';
</script>

<svelte:head>
	<title>Input - Interactive Components - @candor/ui-kit</title>
</svelte:head>

<Typography>Input</Typography>

<div class="story">
	<Panel variant="offset">
		<Typography el="h3">Text Input</Typography>
		<Input id="example_text" type="text" placeholder="Text input" />
		<Typography el="h4">Usage</Typography>
		<Syntax
			language="svelte"
			code={`<Input id="example_text" type="text" placeholder="Text Input" />`}
		/>
	</Panel>
	<Panel variant="offset">
		<Typography el="h3">With Label</Typography>
		<Input id="example_label" type="text" label="Label" placeholder="Text input" />
		<Typography el="h4">Usage</Typography>
		<Syntax
			code={`<Input id="example_label" label="Label" type="text" placeholder="Text Input" />`}
		/>
	</Panel>
	<Panel variant="offset">
		<Typography el="h3">Custom Width</Typography>
		<Input id="example_width" width="w-full" type="text" label="Label" placeholder="Text input" />
		<Typography el="h4">Usage</Typography>
		<Syntax
			code={`<Input id="example_width" width="w-full" label="Label" type="text" placeholder="Text Input" />`}
		/>
	</Panel>
	<Panel variant="offset">
		<Typography el="h3">Prepend & Append</Typography>
		<Input id="example_attach" type="text" label="Label" placeholder="Text input">
			<div class="i-tabler-search" slot="prepend" />
			<div class="i-tabler-clock" slot="append" />
		</Input>
		<Typography el="h4">Usage</Typography>
		<Syntax
			code={`<Input id="example_attach" type="text" label="Label" placeholder="Text input">
  <div class="i-tabler-search" slot="prepend"></div>
  <div class="i-tabler-clock" slot="append"></div>
</Input>`}
		/>
	</Panel>
	<Panel variant="offset">
		<Typography el="h3">Errors</Typography>
		<Input
			id="example_error"
			type="text"
			placeholder="Text input"
			error="An example error message"
		/>
		<Typography el="h4">Usage</Typography>
		<Syntax
			code={`<Input id="example_error" type="text" placeholder="Text input" error="An example error message" />`}
		/>
	</Panel>
	<Panel variant="offset">
		<Typography el="h3">Password Input</Typography>
		<Input id="example_password" type="password" placeholder="Password" />
		<Typography el="h4">Usage</Typography>
		<Syntax code={`<Input id="example_password" type="password" placeholder="Password" />`} />
	</Panel>
	<Panel variant="offset">
		<Typography el="h3">E-mail Input</Typography>
		<Input id="example_email" type="email" placeholder="E-mail" />
		<Typography el="h4">Usage</Typography>
		<Syntax code={`<Input id="example_email" type="email" placeholder="E-mail" />`} />
	</Panel>
	<Panel variant="offset">
		<Typography el="h3">Number Input</Typography>
		<Input id="example_number" type="number" placeholder="Number" />
		<Typography el="h4">Usage</Typography>
		<Syntax code={`<Input id="example_number" type="number" placeholder="Number" />`} />
	</Panel>
</div>
