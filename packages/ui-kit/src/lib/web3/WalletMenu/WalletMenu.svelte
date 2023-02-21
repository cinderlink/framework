<script lang="ts">
	import Panel from '$lib/content/Panel/Panel.svelte';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import StatusIndicator from '$lib/indicator/StatusIndicator/StatusIndicator.svelte';
	import Button from '$lib/interactive/Button/Button.svelte';
	import Dropdown from '$lib/interactive/Dropdown/Dropdown.svelte';
	import web3, { disconnect } from '../store';
	import Code from '$lib/content/Code/Code.svelte';
	export let toggled = false;
</script>

<Dropdown icon={false} bind:toggled align="right" width="w-fit">
	<svelte:fragment slot="button" let:toggle>
		<StatusIndicator status={$web3.connected ? 'success' : 'error'} />
		{#if $web3.connected}
			{$web3.displayName}
		{:else}
			Not connected
		{/if}
	</svelte:fragment>

	<Panel>
		{#if !$web3.connected}
			<Button
				width="w-full"
				size="md"
				color="emerald"
				on:click={() => ($web3.modals.connect = true)}
			>
				<div class="i-tabler-plug" />
				Connect
			</Button>
		{:else}
			<Typography el="p" margin="m-0" classes="text-gray-700 dark-text-gray-50 font-bold"
				>Connected as:</Typography
			>
			<Code code={$web3.address} />

			<div class="flex-1 w-full h-full flex flex-row items-end justify-end mt-2">
				<Button
					variant="red"
					size="md"
					on:click={() => {
						disconnect();
					}}
				>
					Disconnect
				</Button>
			</div>
		{/if}
	</Panel>
</Dropdown>
