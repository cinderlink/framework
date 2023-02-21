<script lang="ts">
	import type { Size } from '$lib/theme/types';

	export let href: string | undefined = undefined;
	export let el = href ? 'a' : 'div';
	export let size: Size = 'md';
	export let flex = 'flex flex-col gap-2';
	export let variant: 'default' | 'dark' | 'light' | 'offset' = 'default';
	export let interactive = false;
	export let rounded = 'rounded-md';
	export let classes = '';
	export let invert = false;
</script>

<svelte:element
	this={el}
	on:click
	class="panel panel--{variant} panel--{size} {classes} {flex} {rounded}"
	class:panel--invert={invert}
	class:panel--interactive={interactive}
	{...{ ...$$restProps, ...(el === 'a' ? { href } : {}) }}
>
	<slot />
</svelte:element>

<style>
	.panel {
		@apply transition-all duration-200 ease-in-out text-white;
	}

	.panel.panel--light {
		@apply bg-purple-50 text-purple-900;
	}

	.panel.panel--default {
		@apply bg-purple-50 text-purple-900;
		@apply dark-(bg-purple-900 text-purple-50);
	}
	.panel.panel--offset {
		@apply bg-white text-purple-900;
		@apply dark-(bg-purple-800 text-purple-50);
	}

	.panel.panel--default.panel--invert {
		@apply bg-purple-900 text-purple-50;
		@apply dark-(bg-purple-50 text-purple-900);
	}

	.panel.panel--default.panel--invert :global(a) {
		@apply text-purple-800 dark-(text-purple-50);
	}

	.panel.panel--dark {
		@apply bg-purple-900 text-purple-50;
	}

	a.panel,
	button.panel {
		@apply cursor-pointer;
	}

	.panel--xs {
		@apply p-1;
	}

	.panel--sm {
		@apply p-2 shadow-sm;
	}

	.panel--interactive.panel--sm {
		@apply hover-(shadow-md);
	}

	.panel--md {
		@apply p-4 shadow-md;
	}

	.panel--interactive.panel--md {
		@apply hover-(shadow-lg);
	}

	.panel--lg {
		@apply p-8 shadow-lg;
	}

	.panel--interactive.panel--lg {
		@apply hover-(shadow-xl);
	}

	.panel--xl {
		@apply p-12 shadow-xl;
	}

	.panel--interactive.panel--xl {
		@apply hover-(shadow-2xl);
	}

	.panel--2xl {
		@apply p-16 shadow-2xl;
	}

	.panel--interactive.panel--2xl {
		@apply hover-(shadow-3xl);
	}
</style>
