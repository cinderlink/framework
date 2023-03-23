<script lang="ts">
	import dapp from '$lib/dapp/store';
	import { page } from '$app/stores';
	import type { SchemaInterface } from '@candor/core-types';
	import { Table } from '@candor/ipld-database';
	import { Panel, Typography } from '@candor/ui-kit/content';
	import { Button, List, ListItem } from '@candor/ui-kit/interactive';
	import { Breadcrumb } from '@candor/ui-kit/navigation';
	import { getContext } from 'svelte';

	const schemaId = $page.params.schemaId;
	const schema = getContext<SchemaInterface>('schema');

	async function deleteTable(tableId: string) {
		schema.tables[tableId].emit('/record/deleted', undefined);
		if ($dapp.client)
			schema.tables[tableId] = new Table(tableId, schema.defs[tableId], $dapp.client.dag);
		schema.tables = schema.tables;
		schema.tables[tableId].emit('/record/deleted', undefined);
		await $dapp.client?.save();
	}
</script>

<Breadcrumb
	sections={[
		{
			label: 'db',
			path: '/db'
		},
		{
			label: schema.schemaId,
			path: `/db/${schema.schemaId}`
		}
	]}
/>
<div class="p-4 h-full overflow-auto">
	{#if !schema}
		<p>Schema "{schemaId}" not found.</p>
	{:else}
		<Panel variant="offset">
			<Typography el="h1" classes="flex flex-row gap-2 items-center" margin="m-0">
				<div class="i-tabler-database text-purple-200 text-2xl" />
				{schema.schemaId}
			</Typography>

			<Panel classes="m-2 my-4">
				<Typography el="h3" classes="flex items-center gap-2">
					<div class="i-tabler-table text-yellow-200" />
					Tables
				</Typography>
				<List>
					{#each Object.entries(schema.tables) as [tableId, table]}
						<ListItem>
							<div class="w-1/3">
								<Typography el="h4" classes="flex flex-row gap-2 items-center">
									<div class="i-tabler-table text-yellow-50" />
									{tableId}
								</Typography>
							</div>
							<Typography el="h4" classes="flex flex-row gap-2 items-center">
								<div class="i-tabler-database text-purple-200" />
								{#await table
									.query()
									.select()
									.execute()
									.then((rows) => rows.count())}
									...
								{:then count}
									{count} rows
								{/await}
							</Typography>
							<div class="w-1/3 flex items-center justify-end">
								<section class="flex gap-2 items-center">
									<Button href="/db/{schema.schemaId}/{tableId}" size="sm">
										<div class="i-tabler-map" />
										Explore
									</Button>
									<Button on:click={() => deleteTable(tableId)} variant="red" size="sm">
										<div class="i-tabler-trash" />
										Delete
									</Button>
								</section>
							</div>
						</ListItem>
					{/each}
				</List>
			</Panel>
		</Panel>
	{/if}
</div>
