<script lang="ts">
	import { theme } from '@candor/ui-kit';

	function onToggle() {
		$theme.darkMode = !$theme.darkMode;
	}
</script>

<div
	class="theme-toggle {$theme.darkMode
		? 'i-tabler-sun text-yellow-200'
		: 'i-tabler-moon text-purple-700'}"
	on:click={onToggle}
	on:keypress={onToggle}
/>

<style>
	.theme-toggle {
		@apply w-25px h-25px cursor-pointer;
	}
</style>
