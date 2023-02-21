<script lang="ts">
	import { Typography } from '@candor/ui-kit';
	import dapp from '$lib/dapp/store';
	import { Panel } from '@candor/ui-kit';
	import { List } from '@candor/ui-kit';
	import { ListItem } from '@candor/ui-kit';
	import { Button } from '@candor/ui-kit';
</script>

<div class="p-4">
	<Typography>Database Explorer</Typography>

	<Panel variant="offset">
		<Typography el="h2">Schemas</Typography>
		<List>
			{#each Object.entries($dapp.client?.schemas || {}) as [name, schema]}
				<ListItem variant="square" size="lg">
					<div class="flex gap-2 items-center">
						<div class="i-tabler-database text-2xl color-purple-300" />
						<Typography el="h3" margin="m-none">
							{name}
						</Typography>
					</div>
					<Typography el="h4" margin="m-none">
						{Object.keys(schema.tables).length} tables
					</Typography>
					<Typography el="h4" margin="m-none">
						{#await Promise.all(Object.values(schema.tables).map((table) => table
									.query()
									.select()
									.execute()
									.then((rows) => rows.count())))}
							...
						{:then counts}
							{counts.reduce((a, b) => a + b, 0)} rows
						{/await}
					</Typography>
					<section class="flex gap-2 items-center">
						<Button href="/db/{schema.schemaId}">
							<div class="i-tabler-map" />
							Explore
						</Button>
						<Button href="/db/{schema.schemaId}/delete" variant="red">
							<div class="i-tabler-trash" />
							Delete
						</Button>
					</section>
				</ListItem>
			{/each}
		</List>
	</Panel>
</div>
