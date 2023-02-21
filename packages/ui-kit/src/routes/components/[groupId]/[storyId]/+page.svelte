<script lang="ts">
	import { page } from '$app/stores';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import { getStoryById } from '$lib/ddl/stories';
	import Breadcrumb from '$lib/navigation/Breadcrumb/Breadcrumb.svelte';
	const story = getStoryById($page.params.groupId, $page.params.storyId);
</script>

<Breadcrumb
	sections={[
		{ label: 'components', path: '/components' },
		{ label: $page.params.groupId, path: `/components/${$page.params.groupId}` },
		{
			label: $page.params.storyId,
			path: `/components/${$page.params.groupId}/${$page.params.storyId}`
		}
	]}
/>

{#if story}
	<svelte:component this={story.default} />
{:else}
	<Typography>404</Typography>
	<p>Component story not found: <strong>{$page.params.groupId}/{$page.params.storyId}</strong></p>
{/if}
