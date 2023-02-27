<script lang="ts">
	import Logo from '$lib/Logo.svelte';
	import ThemeToggle from '$lib/theme/ThemeToggle.svelte';
</script>

<div
	class="max-w-400px md-(max-w-50vw) lg-(max-w-40vw) xl-(max-w-25vw) flex flex-col items-center gap-2"
>
	<div class="flex w-full justify-end">
		<ThemeToggle />
	</div>
	<slot name="brand">
		<Logo />
	</slot>
	
	<slot />
</div>