<script lang="ts" context="module">
	import type { StoryDef } from '$lib/ddl/stories';

	export const story: StoryDef = {
		group: 'navigation',
		id: 'breadcrumb',
		title: 'Breadcrumb',
		description: 'Breadcrumb component'
	};
</script>

<script lang="ts">
	import Breadcrumb from './Breadcrumb.svelte';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import Syntax from '$lib/content/Syntax/Syntax.svelte';
</script>

<svelte:head>
	<title>Breadcrumb - Navigation Components - @candor/ui-kit</title>
</svelte:head>

<Typography>Breadcrumb</Typography>

<div class="flex flex-row gap-2 mt-4">
	<section class="flex flex-col gap-2">
		<Breadcrumb
			sections={[
				{ path: '/components/navigation/breadcrumb', label: 'Foo' },
				{ path: '/components/navigation/breadcrumb', label: 'Bar' },
				{ path: '/components/navigation/breadcrumb', label: 'Baz' },
				{ path: '/components/navigation/breadcrumb', label: 'Bam' }
			]}
		/>

		<Syntax code={`<Breadcrumb sections={[{ path: "/", label: "Foo" }]}></Breadcrumb>`} />
	</section>
</div>
