<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'interactive',
		id: 'modal',
		title: 'Modal',
		description: 'Modal dialog component'
	};
</script>

<script lang="ts">
	import Syntax from '$lib/content/Syntax/Syntax.svelte';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import Button from '../Button/Button.svelte';
	import Modal from './Modal.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';

	let open = false;
</script>

<svelte:head>
	<title>Modal - Interactive Components - @candor/ui-kit</title>
</svelte:head>

<Typography>Modal</Typography>

<div class="story">
	<Panel variant="offset">
		<Typography el="h4">Example</Typography>
		<Button on:click={() => (open = true)}>Open Modal</Button>
		<Modal bind:visible={open}>
			<svelte:fragment slot="header">
				<Typography el="h3">Modal Title</Typography>
				<Button size="sm" variant="outlined" color="rose" on:click={() => (open = false)}
					>Close</Button
				>
			</svelte:fragment>

			<Typography el="p">Modal content</Typography>

			<svelte:fragment slot="footer">
				<Typography el="p">Modal footer</Typography>
			</svelte:fragment>
		</Modal>

		<Typography el="h4">Usage</Typography>
		<Syntax
			code={`<Button on:click={openModal}>Open Modal</Button>
<Modal bind:visible={open}>
  <svelte:fragment slot="header">
    <Typography el="h3">Modal Title</Typography>
    <Button size="sm" variant="outlined" color="rose" on:click={closeModal}>
      Close
    </Button>
  </svelte:fragment>

  <Typography el="p">Modal content</Typography>

  <svelte:fragment slot="footer">
    <Typography el="p">Modal footer</Typography>
  </svelte:fragment>
</Modal>`}
		/>
	</Panel>
</div>
