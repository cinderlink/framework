<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'interactive',
		id: 'button',
		title: 'Button',
		description: 'Button component'
	};
</script>

<script lang="ts">
	import Typography from '$lib/content/Typography/Typography.svelte';
	import Button from './Button.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';
</script>

<svelte:head>
	<title>Button - Interactive Components - @candor/ui-kit</title>
</svelte:head>

<Typography>Button</Typography>

<div class="story">
	<Panel variant="offset">
		<Typography el="h2">Variants</Typography>
		<div class="showcase sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ">
			<div>
				<Typography el="h4">Default</Typography>
				<Button variant="default">Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">Dark</Typography>
				<Button variant="dark">Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">Light</Typography>
				<Button variant="light">Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">Pink</Typography>
				<Button variant="pink">Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">Green</Typography>
				<Button variant="green">Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">Blue</Typography>
				<Button variant="blue">Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">Yellow</Typography>
				<Button variant="yellow">Hello, world</Button>
			</div>
		</div>
	</Panel>
	<Panel variant="offset">
		<Typography el="h2" classes="mt-4">Sizes</Typography>
		<div class="showcase sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<div>
				<Typography el="h4">sm</Typography>
				<Button size="sm">Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">md</Typography>
				<Button size="md">Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">lg</Typography>
				<Button size="lg">Hello, world</Button>
			</div>
		</div>
	</Panel>
	<Panel variant="offset">
		<Typography el="h2" classes="mt-4">Disabled</Typography>
		<div class="showcase sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<div>
				<Typography el="h4">Default</Typography>
				<Button variant="default" disabled>Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">Dark</Typography>
				<Button variant="dark" disabled>Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">Light</Typography>
				<Button variant="light" disabled>Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">Pink</Typography>
				<Button variant="pink" disabled>Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">Green</Typography>
				<Button variant="green" disabled>Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">Blue</Typography>
				<Button variant="blue" disabled>Hello, world</Button>
			</div>

			<div>
				<Typography el="h4">Yellow</Typography>
				<Button variant="yellow" disabled>Hello, world</Button>
			</div>
		</div>
	</Panel>
</div>

<style>
	.showcase {
		@apply grid gap-2 rounded-lg py-4 px-6;
	}
</style>
