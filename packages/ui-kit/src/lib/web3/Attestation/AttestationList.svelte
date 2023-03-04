<script lang="ts">
    import { onMount } from "svelte";

	export let address: string;
	export let contract: ethers.Contract;
    export const map: Record<string, {
        label: string,
        scorer: (value: number) => number,
        priority?: number;
    }> = {};

    let attestations: ethers.providers.Log[] = [];
    $: {
        attestations = getUserAttestations(address);
        console.info('attestations', attestations);
    }

	async function getUserAttestations(address: string) {
		const filter = await contract.filters.AttestationCreated(address);
		return contract.queryFilter(filter);
	}
</script>