<script lang="ts">
	import { web3, Typography, LoadingIndicator } from '@candor/ui-kit';
	import { connect, getUserRegistry } from '$lib/dapp/functions';
	import { goto } from '$app/navigation';
</script>

<div id="dapp-connect">
	{#if !$web3.connected}
		{#await goto('/')}
			<LoadingIndicator>Connecting...</LoadingIndicator>
		{/await}
	{:else}
		{#await connect()}
			<LoadingIndicator>
				<div>
					<Typography>Waiting for signature...</Typography>
					<Typography el="p">Please sign the message in your wallet to connect to Candor</Typography
					>
				</div>
			</LoadingIndicator>
		{:then}
			{#if $web3.connected}
				{#await goto('/connect/register')}
					<Typography el="h4">Signed in. Redirecting...</Typography>
				{/await}
			{:else}
				<LoadingIndicator>Connecting...</LoadingIndicator>
			{/if}
		{:catch error}
			<Typography el="h4" classes="text-rose-500">Error</Typography>
			<Typography classes="text-rose-500" el="p">
				An unexpected error occurred while connecting. Verify your network connection and refresh
				your browser or try again later.
			</Typography>
			<Typography classes="text-rose-500" el="p">Error: {error.message}</Typography>
			{#if error.stack}
				<Typography classes="text-rose-500" el="p">Stack: {error.stack}</Typography>
			{/if}
		{/await}
	{/if}
</div>
