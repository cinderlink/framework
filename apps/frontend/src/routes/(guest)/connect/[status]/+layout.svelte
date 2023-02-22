<script lang="ts">
	import { onMount } from 'svelte';
	import { LoadingIndicator } from '@candor/ui-kit';

	let mounted = false;

	onMount(() => {
		mounted = true;
	});
</script>

{#if mounted}
	<slot />
{:else}
	<LoadingIndicator>Loading application state...</LoadingIndicator>
{/if}
