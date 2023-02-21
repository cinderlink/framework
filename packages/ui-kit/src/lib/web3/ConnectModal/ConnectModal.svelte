<script lang="ts">
	import { web3 } from '$lib/web3/store';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import Button from '$lib/interactive/Button/Button.svelte';
	import Modal from '$lib/interactive/Modal/Modal.svelte';
	import WalletSelect from '../WalletSelect/WalletSelect.svelte';
</script>

<Modal bind:visible={$web3.modals.connect}>
	<svelte:fragment slot="header">
		<slot name="header">
			<slot name="title"><Typography el="h3">Connect to Web3</Typography></slot>
			<Button
				size="sm"
				variant="outlined"
				color="rose"
				on:click={() => ($web3.modals.connect = false)}
			>
				Close
			</Button>
		</slot>
	</svelte:fragment>

	<WalletSelect on:connect />
</Modal>
