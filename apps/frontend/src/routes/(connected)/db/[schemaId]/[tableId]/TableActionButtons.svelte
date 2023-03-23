<script lang="ts">
	import type { TableInterface, TableRow } from '@candor/core-types';
	import { Button } from '@candor/ui-kit/interactive';
	import { createEventDispatcher } from 'svelte';

	export let record: TableRow;
	export let table: TableInterface;

	const dispatch = createEventDispatcher();
</script>

<section class="flex gap-2 items-center justify-center">
	<Button
		on:click={() => {
			table
				.query()
				.where('id', '=', record.id)
				.delete()
				.execute()
				.then(() => {
					dispatch('refresh');
				});
		}}
		variant="red"
		size="xs"
	>
		<div class="i-tabler-trash" />
		Delete
	</Button>
</section>
