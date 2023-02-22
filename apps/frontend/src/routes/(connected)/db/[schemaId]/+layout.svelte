<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import dapp from '$lib/dapp/store';
	import { LoadingIndicator } from '@candor/ui-kit';
	import { setContext } from 'svelte';

	const schemaId = $page.params.schemaId;
	const schema = $dapp.client?.getSchema(schemaId);

	if (!schema) {
		goto('/connect');
	}

	setContext('schema', schema);
</script>

<div class="p-4 h-full overflow-auto">
	{#if !schema}
		<LoadingIndicator>Loading schema "{schemaId}"...</LoadingIndicator>
	{:else}
		<slot />
	{/if}
</div>
