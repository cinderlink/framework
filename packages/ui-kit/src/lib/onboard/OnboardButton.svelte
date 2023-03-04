<script lang="ts">
	import Button from '$lib/interactive/Button/Button.svelte';
	import { onboard } from './store';
</script>

<Button {...$$restProps} on:click={() => onboard.connectWallet()}>
	<slot>
		<div class="i-tabler-wallet" />
		Connect Wallet
	</slot>
</Button>
