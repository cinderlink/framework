<script lang="ts">
	import { fly } from 'svelte/transition';
	import { page } from '$app/stores';
	import { Typography } from '@candor/ui-kit';
	import { Button } from '@candor/ui-kit';
	import { Logo } from '@candor/ui-kit';

	const status = $page.params.status;
	const statusText = status === 'sign-in' ? 'Sign in' : 'Sign up';

	let acknowledged = false;
	let step = 0;
</script>

<div
	class="flex flex-col gap-2 items-center justify-center text-center max-w-400px md-(max-w-50vw) lg-(max-w-40vw) xl-(max-w-33vw)"
>
	<Logo />
	{#if status !== 'sign-in' && !acknowledged}
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
				your data. Only you have access to your account key. Do not share your account key with
				anyone.
			</Typography>
		{:else if step == 2}
			<Typography classes="font-700">Crypto optional...</Typography>
			<Typography el="p">
				You can use Candor without crypto. Even when using a crypto wallet, using Candor is free.
				Crypto features are optional and can be enabled or disabled at any time.
			</Typography>
		{:else}
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
	{:else}
		{#if status === 'sign-in'}
			<Typography>Welcome back!</Typography>
			<Typography el="h4">Select your signature provider to get started.</Typography>
		{:else if acknowledged}
			<Typography>Welcome to Candor</Typography>
		{/if}

		<Button width="w-full" variant="yellow" size="md" href="/connect/{status}/wallet">
			<div class="i-tabler-wallet" />
			{statusText} with wallet
		</Button>

		<Button width="w-full" color="green" size="md" href="/connect/{status}/key">
			<div class="i-tabler-file-upload" />
			{statusText} with account key
		</Button>

		<Button width="w-full" size="md" variant="none" href="/help/connect#account-key">
			<div class="i-tabler-help" />
			What is an account key?
		</Button>
	{/if}
</div>

<div class="w-full flex flex-row justify-start items-center mt-2">
	<Button size="sm" variant="none" href="/connect">
		<div class="i-tabler-arrow-left" />
		Back
	</Button>
</div>
