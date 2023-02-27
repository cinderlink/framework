<script lang="ts">
	import { onMount } from 'svelte';
	import { Wallet } from 'ethers';
	import web3 from '$lib/web3/store';

	let keystoreAddress = '';
	let encryptedAccount = '';
	let encryptedAccountHint = '';
	let wallet: Wallet | undefined = undefined;
    let fileInput: HTMLInputElement | undefined = undefined;

	onMount(async () => {
		const mnemonic = sessionStorage.getItem('keystore:mnemnonic');
		if (mnemonic) {
			wallet = Wallet.fromMnemonic(mnemonic);
			keystoreAddress = wallet.address;
		} else {
			encryptedAccount = localStorage.getItem('keystore:encrypted');
		}
	});

	function selectWallet(wallet: Wallet) {
		web3.update((state) => ({
			...state,
			wallet,
			address: wallet.address,
			signer: wallet.getSigner()
		}));
	}

	async function onFileUpload() {
		if (!fileInput) {
			return;
		}
		const file = fileInput.files?.[0];
		if (!file) {
			return;
		}
		const reader = new FileReader();
		reader.onload = async (e) => {
			if (!e.target) {
				return;
			}
			const accountFile = e.target.result as string;
			const { wallet, hint } = JSON.parse(accountFile);
			selecting = true;
			encryptedAccount = wallet;
			encryptedAccountHint = hint;
		};
		reader.readAsText(file);
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

</script>

<div class="keystore__import">
	{#if wallet}
		<slot name="completed">
			<LoadingIndicator>Logging in...</LoadingIndicator>
		</slot>
	{:else if encryptedAccount}
		<Typography>Unlock your account</Typography>
	{:else}
        <Input label="Import Account File" type="file" bind:this={fileInput} on:change={onFileUpload} />
	{/if}
</div>
