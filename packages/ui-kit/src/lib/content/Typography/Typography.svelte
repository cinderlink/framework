<script lang="ts">
	import type { TypographyElement } from './types';
	export let el: TypographyElement = 'h1';
	export let margin = 'mb-4';
	export let classes = 'text-purple-900 dark-(text-purple-50)';
</script>

<svelte:element this={el} class="typography {classes} {margin}">
	<slot />
</svelte:element>

<style>
	h1.typography {
		@apply text-4xl;
	}
	h2.typography {
		@apply text-3xl;
	}
	h3.typography {
		@apply text-2xl;
	}
	h4.typography {
		@apply text-xl;
	}
	h5.typography {
		@apply text-lg;
	}
	h6.typography {
		@apply text-base;
	}
	p.typography {
		@apply text-base;
	}
	caption.typography {
		@apply text-sm;
	}
	strong.typography {
		@apply font-bold;
	}
</style>
