<script lang="ts">
	import { page } from '$app/stores';
	import groups, { getGroupById } from '$lib/ddl/groups';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import { getStoriesByGroupId } from '$lib/ddl/stories';
	import Card from '$lib/content/Card/Card.svelte';
	import Breadcrumb from '$lib/navigation/Breadcrumb/Breadcrumb.svelte';
	let group: any;
	$: group = getGroupById($page.params.groupId);
</script>

<Breadcrumb
	sections={[
		{ label: 'components', path: '/components' },
		{ label: $page.params.groupId, path: `/components/${$page.params.groupId}` }
	]}
/>

{#if group}
	{@const stories = getStoriesByGroupId($page.params.groupId)}
	<svelte:component this={group.default} />
	<div class="flex flex-col gap-2 mt-4 overflow-auto">
		{#each stories as { default: Story, story }}
			<Card href="/components/{story.group}/{story.id}" title={story.title} align="items-start">
				<Typography el="p">{story.description}</Typography>
			</Card>
		{/each}
	</div>
{:else}
	<div class="mt-4">
		<Typography>404</Typography>
		<p>Component group not found: <strong>{$page.params.groupId}</strong></p>
		<p class="mt-4">Available component groups:</p>
		<ul class="px-4">
			{#each Object.values(groups) as { group }}
				<li><a href="/components/{group.id}">{group.id}</a></li>
			{/each}
		</ul>
	</div>
{/if}
