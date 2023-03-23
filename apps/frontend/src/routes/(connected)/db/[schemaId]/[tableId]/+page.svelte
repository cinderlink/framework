<script lang="ts">
	import type { TableInterface, SchemaInterface } from '@candor/core-types';
	import { Typography } from '@candor/ui-kit/content';
	import { Datatable } from '@candor/ui-kit/data';
	import { Breadcrumb } from '@candor/ui-kit/navigation';
	import { getContext, onMount } from 'svelte';
	import TableActionButtons from './TableActionButtons.svelte';

	const schema = getContext<SchemaInterface>('schema');
	const table = getContext<TableInterface>('table');
	let data: Record<string, unknown>[] = [];

	async function getData() {
		data =
			((await table
				.query()
				.select()
				.execute()
				.then((r) => r.all())) as Record<string, unknown>[]) || [];
	}

	$: columns = [
		{
			id: 'id',
			label: 'ID'
		},
		...Object.keys(table.def.schema.properties)
			.filter((key) => key !== 'id')
			.map((key) => ({
				id: key,
				label: key,
				transform: (value: unknown) => {
					if (value === undefined) return '(undefined)';
					if (typeof value === 'object') return JSON.stringify(value, null, 2);
					return value;
				}
			})),
		{
			id: 'actions',
			label: 'Actions',
			component: TableActionButtons,
			props: {
				table
			}
		}
	];

	onMount(async () => {
		await getData();

		table.on('/record/inserted', getData);
		table.on('/record/updated', getData);
		table.on('/record/deleted', getData);
		table.on('/block/saved', getData);
	});
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
		},
		{
			label: table.tableId,
			path: `/db/${schema.schemaId}/${table.tableId}`
		}
	]}
/>
<Typography>{table.tableId}</Typography>
<Datatable schema={table.def.schema} {data} {columns} on:refresh={getData} />
