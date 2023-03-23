<script lang="ts">
	import { Logo } from '@candor/ui-kit';
	import { Typography } from '@candor/ui-kit/content';
	import { Button } from '@candor/ui-kit/interactive';
	import { web3 } from '@candor/ui-kit/web3';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DappConnect from '$lib/dapp/DappConnect.svelte';

	let acknowledged = false;
	let step = 0;

	$: if (step === 4) {
		localStorage.setItem('acknowledged', 'true');
		goto('/connect');
	}
</script>

{#if step == 0}
	<Typography classes="font-700">Before we begin...</Typography>
	<Typography el="h4" classes="text-green-800 dark-text-green-500 font-900">
		Candor is an open-source decentralized network.
	</Typography>
	<Typography el="p">
		<strong>Anyone</strong> can run a server and get paid to contribute to the network.
	</Typography>
{:else if step == 1}
	<Typography classes="font-700">Your Data is Encrypted...</Typography>
	<Typography el="h4" classes="text-green-800 dark-text-green-500 font-900"
		>We can't read your data.</Typography
	>
	<Typography el="p">
		All of your private data on Candor is encrypted using your account key. Only you can decrypt
		your data. Only you have access to your account key. Do not share your account key with anyone.
	</Typography>
{:else if step == 2}
	<Typography classes="font-700">Crypto optional...</Typography>
	<Typography el="p">
		You can use Candor without crypto. Even when using a crypto wallet, using Candor is free. Crypto
		features are optional and can be enabled or disabled at any time.
	</Typography>
{:else if step == 3}
	<Typography classes="font-700 text-yellow-800 dark-text-yellow-300"
		>Candor is a work in progress</Typography
	>
	<Typography el="p">
		Candor is still in beta. We are working hard to make it better every day.
	</Typography>
	<Typography el="p">
		By using Candor, you agree to our <a href="/terms">Terms of Service</a> and
		<a href="/privacy">Privacy Policy</a>.
	</Typography>
{:else}
	<LoadingIndicator>
		<Typography el="p" classes="text-green-800 dark-text-green-500 font-900">
			Ok, let's connect and create your account...
		</Typography>
	</LoadingIndicator>
{/if}
<div class="flex flex-row items-center justify-between gap-4 mt-4 w-full">
	{#if step === 3}
		<Button
			size="sm"
			width="w-full"
			variant="green"
			on:click={() => {
				acknowledged = true;
			}}
		>
			<div class="i-tabler-check" />
			I understand, continue
		</Button>
	{:else}
		<Button
			size="sm"
			width="w-1/2"
			variant="yellow"
			on:click={() => {
				step = 4;
				acknowledged = true;
			}}
		>
			<div class="i-tabler-player-skip-forward" />
			Skip Intro
		</Button>
		<Button
			size="sm"
			width="w-1/2"
			variant="green"
			on:click={() => {
				step = step + 1;
			}}
		>
			<div class="i-tabler-check" />
			Acknowledge
		</Button>
	{/if}
</div>

<div class="w-full flex flex-row justify-start items-center mt-2">
	<Button size="sm" variant="none" href="/connect">
		<div class="i-tabler-arrow-left" />
		Back
	</Button>
</div>
