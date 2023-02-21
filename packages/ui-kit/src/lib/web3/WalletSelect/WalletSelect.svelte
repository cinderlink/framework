<script lang="ts">
	import web3, { reset, disconnect } from '$lib/web3/store';
	import Button from '$lib/interactive/Button/Button.svelte';
	import LoadingIndicator from '$lib/indicator/LoadingIndicator/LoadingIndicator.svelte';
	import Card from '$lib/content/Card/Card.svelte';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import ChainSelect from './../ChainSelect/ChainSelect.svelte';
	import type { ChainType, WalletDef } from '../types';
	import type { Client, Provider, WebSocketProvider } from '@wagmi/core';
	import { createEventDispatcher, onMount } from 'svelte';
	import chains from '../chains';

	const dispatch = createEventDispatcher();

	export let chainId: ChainType | undefined = undefined;
	export let walletId: string | undefined = undefined;

	onMount(() => {
		console.info('chainId', chainId, 'walletId', walletId);
		if (chainId) {
			$web3.type = chainId;
		}
		if (chainId && walletId) {
			$web3.walletId = walletId;
			const chain = chains[chainId];
			const wallet = chain.wallets.find((w) => w.id === walletId);
			if (wallet) {
				console.info('selecting wallet', wallet);
				selectWallet(wallet)();
			}
		}
	});

	export let selectWallet = (wallet: WalletDef) => async () => {
		$web3.walletId = wallet.id;
		if ($web3.type === 'evm') {
			const { connect } = await import('@wagmi/core');
			const connector = await wallet.connector();
			const client: Client<Provider, WebSocketProvider> = await chains.evm.create({
				connectors: [connector]
			});
			const result = await connect({ connector, chainId: 31337 });
			if (result) {
				$web3.evm = {
					client,
					connector: result.connector,
					provider: result.provider,
					chainId: result.chain.id
				};
				$web3.address = result.account;
				$web3.connected = true;
				dispatch('connect', { chain: $web3.type, wallet: $web3.walletId });
			} else {
				reset();
			}
		}
	};

	function onDisconnect() {
		disconnect();
		dispatch('disconnect');
	}
</script>

<!-- i-logos-metamask-icon -->
{#if !$web3.type}
	<Typography el="h3">Select chain</Typography>
	<ChainSelect bind:chainId={$web3.type} />
{:else if !$web3.walletId}
	{@const chain = chains[$web3.type]}
	<Typography el="h3">Select wallet</Typography>
	<div class="wallet-select">
		{#each chain.wallets as wallet}
			<Card
				size="lg"
				on:click={selectWallet(wallet)}
				interactive
				color={walletId === wallet.id ? 'emerald' : 'black'}
				classes="cursor-pointer"
			>
				<div class="flex items-center gap-4 mb-4 mt-2">
					{#if wallet.image}
						{#await fetch(wallet.image).then((res) => res.text())}
							<svg
								class="w-8 h-8 color-white"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<image href={wallet.image} width="24" height="24" />
							</svg>
						{:then image}
							<div
								class="w-8 h-8 fill-black group-hover-(fill-blue-400) transition-colors duration-300"
							>
								{@html image}
							</div>
						{/await}
					{:else if wallet.icon}
						<div class="text-4xl {wallet.icon}" />
					{/if}
					<Typography el="h3" classes="mb-0!">{wallet.name}</Typography>
				</div>
				<Typography el="p" classes="mb-2">{wallet.description}</Typography>
			</Card>
		{/each}
	</div>
	<div class="mt-4">
		<Button variant="ghost" on:click={() => ($web3.type = undefined)}>
			<div class="i-tabler-arrow-left" />
			Change chain
		</Button>
	</div>
{:else if $web3.connected}
	<slot>
		<Typography el="h3">Connected</Typography>
		<Typography el="p">Connected as {$web3.address} using {$web3.walletId}</Typography>
		<Button color="red" variant="outlined" on:click={onDisconnect} classes="mt-4">
			<div class="i-tabler-x" />
			Disconnect
		</Button>
	</slot>
{:else}
	<LoadingIndicator
		>Connecting {#if $web3.walletId} with {$web3.walletId}{/if}...</LoadingIndicator
	>
{/if}

<style>
	.wallet-select {
		@apply flex flex-wrap gap-4;
	}
</style>
