<script lang="ts">
	import darkTheme from 'svelte-highlight/styles/a11y-dark';
	import lightTheme from 'svelte-highlight/styles/a11y-light';
	import { onMount } from 'svelte';
	import theme from '$lib/theme/store';
	export let code = '';
	export let language = 'svelte';
	export let ref: HTMLElement | undefined = undefined;
	let style = '';
	$: style = $theme.darkMode ? darkTheme : lightTheme;

	let hljs: any;
	onMount(async () => {
		const hljsModule = await import('highlight.js');
		hljs = hljsModule.default;
		if (language === 'svelte') {
			const hljsSvelte = await import('highlightjs-svelte');
			hljsSvelte.default(hljs);
		}
	});

	$: if (ref && hljs) {
		hljs.highlightElement(ref);
	} else {
		console.info({ ref, hljs });
	}
</script>

<svelte:head>
	{@html style}
</svelte:head>

<pre class="{language} whitespace-pre-wrap" bind:this={ref}><code>{code}</code></pre>

<style>
	pre {
		@apply p-4 my-2 bg-neutral-100 dark-(bg-gray-900) rounded-md overflow-auto w-full border-1px border-gray-300/10;
	}
</style>
