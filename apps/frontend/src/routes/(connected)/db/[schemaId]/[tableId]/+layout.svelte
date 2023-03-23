<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { SchemaInterface } from '@candor/core-types';
	import { LoadingIndicator } from '@candor/ui-kit/indicator';
	import { getContext, setContext } from 'svelte';

	const schemaId = $page.params.schemaId;
	const schema = getContext<SchemaInterface>('schema');
	const tableId = $page.params.tableId;
	const table = schema?.getTable(tableId);

	if (!schema || !table) {
		goto('/connect');
	}

	setContext('table', table);
</script>

{#if !schema || !table}
	<LoadingIndicator>Loading table "{tableId}"...</LoadingIndicator>
{:else}
	<slot />
{/if}
