<script lang="ts">
	import Logo from '$lib/Logo.svelte';
	import ThemeToggle from '$lib/theme/ThemeToggle.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';
</script>

<div class="max-w-400px md-(max-w-50vw) lg-(max-w-40vw) xl-(max-w-25vw) max-h-full overflow-auto">
	<Panel size="lg">
		<div class=" flex flex-col items-center justify-center gap-8">
			<div class="flex w-full justify-end">
				<ThemeToggle />
			</div>
			<slot name="brand">
				<Logo />
			</slot>
			<div class="flex flex-col gap-4 items-center justify-center">
				<slot />
			</div>
		</div>
	</Panel>
</div>
