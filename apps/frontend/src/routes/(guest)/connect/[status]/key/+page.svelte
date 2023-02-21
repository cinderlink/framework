<script lang="ts">
	import { ethers, Wallet } from 'ethers';
	import { Typography } from '@candor/ui-kit';
	import { LoadingIndicator } from '@candor/ui-kit';
	import { web3, chains } from '@candor/ui-kit';
	import type { Client, Provider, WebSocketProvider } from '@wagmi/core';
	import { Button, Input } from '@candor/ui-kit';
	import { Logo } from '@candor/ui-kit';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import DappConnect from '$lib/dapp/DappConnect.svelte';
	import ThemeToggle from '$lib/components/theme/ThemeToggle.svelte';

	const { status } = $page.params;

	export let encrypted: string | undefined = undefined;
	export let encryptionKey = '';

	let loading: string | false = false;
	let progress = 0;
	let error: string | undefined = undefined;
	let wallet: Wallet | undefined = undefined;
	let fileRef: HTMLInputElement | undefined = undefined;
	let mnemonic: { locale: string; path: string; phrase: string } | null = null;

	onMount(async () => {
		encrypted = localStorage.getItem('candor:key') || undefined;
		mnemonic = JSON.parse(sessionStorage.getItem('wallet') || 'null');
		if (mnemonic) {
			loading = 'Restoring active session...';
			wallet = ethers.Wallet.fromMnemonic(mnemonic.phrase, mnemonic.path);
			if (wallet) {
				console.info('wallet found in session storage', wallet);
				await connectToWallet(wallet).catch(() => {
					error =
						'Failed to connect to using your account key. Verify your encryption key and your network connection and try again.';
				});
			}
			loading = false;
		}
	});

	async function unlockAccountKey() {
		if (!encrypted || !encryptionKey) {
			error = 'Account key not found or invalid.';
			return;
		}
		loading = 'Unlocking account key...';
		// encrypted contains a JSON encrypted ethers wallet
		wallet = await ethers.Wallet.fromEncryptedJson(encrypted, encryptionKey).catch(() => undefined);
		if (!wallet) {
			error = 'Failed to decrypt account key. Please check your encryption key.';
			loading = false;
			return;
		}

		sessionStorage.setItem('mnemonic', JSON.stringify(wallet.mnemonic));

		await connectToWallet(wallet).catch(() => {
			error =
				'Failed to connect to using your account key. Verify your encryption key and your network connection and try again.';
		});
		loading = false;
	}

	async function createAccountKey() {
		wallet = ethers.Wallet.createRandom();
	}

	async function encryptAccountKey() {
		if (!wallet) {
			error = 'Account key not found.';
			return;
		}

		loading = 'Encrypting account key...';
		encrypted = await wallet.encrypt(
			encryptionKey,
			{
				scrypt: {
					N: 2 ** 4
				}
			},
			(p) => {
				progress = p;
			}
		);

		if (!encrypted) {
			error = 'Failed to encrypt account key.';
			return;
		}

		localStorage.setItem('candor:key', encrypted);
		await connectToWallet(wallet);
		loading = false;
	}
	async function importAccountKey() {
		if (!fileRef) {
			error = 'File input not found.';
			return;
		}
		loading = 'Importing account key...';
		const file = fileRef.files?.[0];
		if (!file) {
			error = 'No file selected.';
			loading = false;
			return;
		}

		const reader = new FileReader();
		reader.onload = async (e) => {
			if (!e.target) {
				error = 'Failed to read file.';
				return;
			}
			encrypted = e.target.result as string;
			loading = false;
		};
	}

	async function connectToWallet(wallet: Wallet) {
		loading = 'Connecting to the Candor Network...';
		const { connect } = await import('@wagmi/core');
		const connector = await chains.evm.key.connector(wallet);
		const client: Client<Provider, WebSocketProvider> = await chains.evm.create({
			connectors: [connector]
		});
		const result = await connect({ connector, chainId: 31337 });
		if (result) {
			localStorage.setItem('candor:accountType', 'key');
			$web3.evm = {
				client,
				connector: result.connector,
				provider: result.provider,
				chainId: result.chain.id
			};
			$web3.address = result.account;
			$web3.connected = true;
		} else {
			reset();
			error = 'Failed to connect to the Candor Network. Please try again.';
		}
	}

	async function reset() {
		$web3.evm = undefined;
		$web3.address = undefined;
		$web3.connected = false;
		localStorage.clear();
		// reset indexeddb
		window.indexedDB.deleteDatabase('candor');
		window.indexedDB.deleteDatabase('candor/datastore');
		window.indexedDB.deleteDatabase('candor/blocks');
		window.indexedDB.deleteDatabase('candor/keys');
		window.indexedDB.deleteDatabase('candor/pins');
		window.indexedDB.deleteDatabase('localforage');

		wallet = undefined;
		encrypted = undefined;
		error = undefined;
		loading = false;
		encryptionKey = '';
	}

	async function forgetKey() {
		await reset();
		return goto('/connect/sign-in');
	}
</script>

<div
	class="max-w-400px md-(max-w-50vw) lg-(max-w-40vw) xl-(max-w-25vw) flex flex-col items-center gap-2"
>
	<div class="flex w-full justify-end">
		<ThemeToggle />
	</div>
	<Logo />
	{#if loading}
		<LoadingIndicator>
			<Typography el="p">
				{loading}
			</Typography>
			{#if progress}
				<Typography el="caption">
					{Math.round(progress * 100)}%
				</Typography>
			{/if}
		</LoadingIndicator>
	{:else if $web3.connected}
		<DappConnect />
	{:else if encrypted}
		<Typography el="h2" margin="m-0" classes="font-black text-center"
			>Unlock your Account</Typography
		>
		<Typography el="caption" margin="m-0">
			An encrypted account key was found in your browser. Please enter your encryption key to unlock
			your account.
		</Typography>
		<form on:submit|preventDefault={unlockAccountKey} class="flex flex-col gap-2 w-full mt-2">
			<Input
				type="password"
				id="encryptionKey"
				size="sm"
				label="Encryption Key"
				bind:value={encryptionKey}
			/>
			{#if error}
				<Typography el="p" classes="text-red-200">
					{error}
				</Typography>
			{/if}
			<Button
				type="submit"
				size="sm"
				variant="green"
				width="w-full"
				disabled={encryptionKey.length < 12}
			>
				<div class="i-tabler-lock" />
				Unlock
			</Button>
		</form>
		<Button on:click={forgetKey} size="sm" variant="red" width="w-full">
			<div class="i-tabler-trash" />
			Forget Account Key
		</Button>
	{:else if wallet}
		<Typography el="h2" classes="font-black text-center">Encrypt your Account</Typography>
		<Typography el="caption" margin="m-0" classes="text-center">
			Please save your encryption key in a safe place. You will need it to unlock your account. We
			do not store your encryption key, and therefore cannot help you to recover it.
		</Typography>
		<form
			on:submit|preventDefault={() => encryptAccountKey()}
			class="flex flex-col gap-2 w-full mt-2"
		>
			<Input size="sm" id="address" label="Address" bind:value={wallet.address} readonly disabled />
			{#if error}
				<Typography el="p" classes="text-red-200">
					{error}
				</Typography>
			{/if}
			<Input
				size="sm"
				type="password"
				id="encryptionKey"
				label="Encryption Key"
				bind:value={encryptionKey}
			/>
			{#if encryptionKey.length > 0 && encryptionKey.length < 12}
				<Typography el="p" classes="text-yellow-200">
					Encryption key must be at least 12 characters long.
				</Typography>
			{/if}
			<Button width="w-full" variant="yellow" type="submit" disabled={encryptionKey.length < 12}>
				<div class="i-tabler-key" />
				Connect
			</Button>
			<Button on:click={reset} variant="none" width="w-full">
				<div class="i-tabler-arrow-left" />
				Back
			</Button>
		</form>
	{:else}
		<div class="flex flex-col gap-2 text-center">
			<Typography classes="title">
				<div class="i-tabler-key" />
				Account Key
			</Typography>
			<div class="mb-4">
				<Typography el="caption" margin="m-0" classes="block">
					An account key is a private key that is used to sign transactions on the blockchain. You
					can create a new account key, or import an existing key if you have one.
				</Typography>
			</div>
			{#if error}
				<Typography el="p" classes="text-red-200">
					{error}
				</Typography>
			{/if}
			<Button on:click={createAccountKey} variant="yellow">
				<div class="i-tabler-key" />
				Create Account Key
			</Button>
			<Button
				width="w-full"
				on:click={() => {
					fileRef?.click();
				}}
			>
				<div class="i-tabler-upload" />
				Import Account Key
			</Button>
			<Button href="/connect/{status}" variant="none" width="w-full">
				<div class="i-tabler-arrow-left" />
				Back
			</Button>
		</div>
		<input
			class="hidden"
			bind:this={fileRef}
			type="file"
			id="uploadKey"
			on:change={importAccountKey}
		/>
	{/if}
</div>

<style>
	:global(.typography.title) {
		@apply flex flex-row items-center justify-center gap-2 font-black;
	}
</style>
