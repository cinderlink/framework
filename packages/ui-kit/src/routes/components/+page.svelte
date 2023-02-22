<script lang="ts">
	import Typography from '$lib/content/Typography/Typography.svelte';
	import Card from '$lib/content/Card/Card.svelte';
	import groups from '$lib/ddl/groups';
	import Breadcrumb from '$lib/navigation/Breadcrumb/Breadcrumb.svelte';
</script>

<Breadcrumb sections={[{ label: 'components', path: '/components' }]} />

<Typography>Components</Typography>
<div class="flex flex-col gap-2 mt-4 overflow-auto">
	{#each Object.values(groups) as { group }}
		<Card href="/components/{group.id}" align="items-start" title={group.label}>
			<Typography el="p">{group.description}</Typography>
		</Card>
	{/each}
</div>
