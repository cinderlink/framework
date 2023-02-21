<script lang="ts">
	import hljs from 'highlight.js/lib/common';
	import darkTheme from 'svelte-highlight/styles/a11y-dark';
	import lightTheme from 'svelte-highlight/styles/a11y-light';
	import { onMount } from 'svelte';
	import theme from '$lib/theme/store';
	export let code = '';
	export let language = 'svelte';
	export let ref: HTMLElement | undefined = undefined;
	$: style = $theme.darkMode ? darkTheme : lightTheme;

	onMount(async () => {
		if (language === 'svelte') {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			const hljsSvelte = await import('highlightjs-svelte');
			hljsSvelte.default(hljs);
		}
		if (ref) hljs.highlightElement(ref);
	});
</script>

<svelte:head>
	{@html style}
</svelte:head>

<pre class="language-{language} whitespace-pre-wrap" bind:this={ref}><code>{code}</code></pre>

<style>
	pre {
		@apply p-4 my-2 bg-neutral-100 dark-(bg-gray-900) rounded-md overflow-auto w-full border-1px border-gray-300/10;
	}
</style>
