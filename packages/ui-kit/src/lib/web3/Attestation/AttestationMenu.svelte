<script lang="ts">
	import LoadingIndicator from '$lib/indicator/LoadingIndicator/LoadingIndicator.svelte';
	import Button from '$lib/interactive/Button/Button.svelte';
	import Dropdown from '$lib/interactive/Dropdown/Dropdown.svelte';
	import List from '$lib/interactive/List/List.svelte';
	import { theme } from '$lib/theme/store';
	import { web3 } from '$lib/web3/store';
	import type { Size } from '$lib/unocss';
	import { ethers } from 'ethers';

	export let address: string;
	export let label: string;
	export let size: Size;
	export let align: 'left' | 'right' = 'left';

	export let contract: ethers.Contract;

	interface AttestationOption {
		key: string;
		label: string;
		value?: number;
		valueFn?: (address: string) => number;
	}

	export let options: AttestationOption[] = [];

	let attesting = false;
	let error: string | undefined = undefined;
	let success: boolean = false;

	function encodeRawKey(key: string) {
		if (key.length < 32) return ethers.utils.formatBytes32String(key);

		const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(key));
		return hash.slice(0, 64) + 'ff';
	}

	async function selectAttestationOption(option: AttestationOption) {
		if (!contract) {
			error = 'No AttestationStation contract found';
			return;
		}

		if (!$web3.provider) {
			console.warn(`ui-kit/AttestationMenu: No wallet provider found`, $web3);
			error = 'No wallet provider found';
			return;
		}

		if (!$web3.signer) {
			error = 'No signer found';
			return;
		}

		attesting = true;
		error = undefined;
		success = false;

		const tx = await contract.attest([
			{
				about: address,
				key: encodeRawKey(option.key),
				val: option.value ?? option.valueFn?.(address)
			}
		]);
		const receipt = await tx.wait();
		console.info('receipt', receipt);
		attesting = false;
	}
</script>

{#if success}
	<div class="p-4 rounded-md bg-green-500 text-green-900">
		<strong>Success!</strong>
		<p>Attestation sent</p>
	</div>
{:else if error}
	<div class="p-4 rounded-md bg-red-500 text-red-900">
		<strong>Error!</strong>
		<p>{error}</p>
	</div>
{/if}

{#if attesting}
	<LoadingIndicator>Submitting feedback...</LoadingIndicator>
{:else}
	<Dropdown id={`attestation-dropdown-${address}`} {label} {size} {align} {...$$restProps}>
		<List variant={$theme.darkMode ? 'dark' : 'light'} size="sm">
			{#each options as option}
				<Button
					classes="whitespace-nowrap"
					on:click={() => selectAttestationOption(option)}
					size="sm"
				>
					{option.label}
				</Button>
			{/each}
		</List>
	</Dropdown>
{/if}
