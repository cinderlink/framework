<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import Card from '$lib/content/Card/Card.svelte';
	import chains from '../chains/index';

	const dispatch = createEventDispatcher();

	export let chainId: string | undefined = undefined;
	function selectChain(id: string) {
		chainId = id;
		dispatch('select', { chainId });
	}
</script>

<!-- i-logos-ethereum i-tabler-hourglass -->
<div class="chain-select">
	{#each Object.values(chains) as chain}
		<Card
			on:click={() => selectChain(chain.id)}
			interactive
			color={chainId === chain.id ? 'emerald' : 'black'}
		>
			<Typography el="h3" classes="flex gap-2 items-center mt-2">
				<div class="text-4xl {chain.icon}" />
				{chain.name}
			</Typography>
			<Typography el="p" classes="mb-2">{chain.description}</Typography>
		</Card>
	{/each}
</div>

<style>
	.chain-select {
		@apply flex flex-wrap gap-4;
	}
	.chain-select :global(.card) {
		@apply cursor-pointer;
	}
</style>
