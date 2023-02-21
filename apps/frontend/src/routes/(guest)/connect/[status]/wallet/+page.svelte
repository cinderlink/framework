<script lang="ts">
	import { Typography } from '@candor/ui-kit';
	import { LoadingIndicator } from '@candor/ui-kit';
	import { web3, WalletSelect, type ChainType } from '@candor/ui-kit';
	import { connect, getUserRegistry } from '$lib/dapp/functions';
	import { Button } from '@candor/ui-kit';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import DappConnect from '$lib/dapp/DappConnect.svelte';

	const { status } = $page.params;

	let mounted = false;
	let walletId: string | undefined = undefined;
	let chainId: ChainType | undefined = undefined;
	onMount(() => {
		let chain = localStorage.getItem('candor:chain');
		let wallet = localStorage.getItem('candor:wallet');

		console.info('chain', chain, 'wallet', wallet);

		if (chain) {
			chainId = chain as ChainType;
		}
		if (wallet) {
			walletId = wallet;
		}
		mounted = true;
	});

	function onConnect(e: CustomEvent<{ chain: string; wallet: string }>) {
		console.info('onConnect', e.detail);
		localStorage.setItem('candor:chain', e.detail.chain);
		localStorage.setItem('candor:wallet', e.detail.wallet);
		localStorage.setItem('candor:accountType', 'wallet');
	}
</script>

{#if !mounted}
	<LoadingIndicator>Checking for saved account...</LoadingIndicator>
{:else}
	{#if !chainId || !walletId}
		<Typography>Connect with your wallet</Typography>
	{/if}
	<WalletSelect bind:chainId bind:walletId on:connect={onConnect}>
		<DappConnect />
	</WalletSelect>
{/if}

<div class="w-full flex flex-row justify-end items-center">
	<Button size="md" variant="none" href="/connect/{status}">
		<div class="i-tabler-arrow-left" />
		Back
	</Button>
</div>
