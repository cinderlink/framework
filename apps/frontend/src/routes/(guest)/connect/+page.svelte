<script lang="ts">
	import { Button } from '@candor/ui-kit';
	import { Typography } from '@candor/ui-kit';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Logo } from '@candor/ui-kit';

	//  class="text-purple-100 text-purple-50"

	onMount(() => {
		const accountType = localStorage.getItem('candor:accountType');
		console.info('accountType', accountType);
		if (accountType === 'wallet') {
			goto('/connect/sign-in/wallet');
		} else if (accountType === 'key') {
			goto('/connect/sign-in/key');
		} else if (localStorage.getItem('candor:hasAccount') === 'true') {
			goto('/connect/sign-in');
		}
	});
</script>

<div class="flex flex-col gap-2 items-center justify-center">
	<Logo />
	<Typography classes="font-900 text-center">Welcome to Candor</Typography>
	<Typography el="p" classes="text-purple-800 dark-text-purple-100"
		>Is this your first time using Candor?</Typography
	>
</div>

<div class="flex flex-col gap-2">
	<Button variant="yellow" size="md" href="/connect/sign-up">
		<div class="i-tabler-check" />
		I'm new here
	</Button>
	<Button variant="default" size="md" href="/connect/sign-in">
		<div class="i-tabler-login" />
		Log In
	</Button>
</div>
