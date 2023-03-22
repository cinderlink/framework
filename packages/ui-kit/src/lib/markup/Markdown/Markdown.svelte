<script lang="ts">
	import type MarkdownIt from 'markdown-it';
	import { onMount } from 'svelte';
	import theme from '$lib/theme/store';
	import darkTheme from 'svelte-highlight/styles/a11y-dark';
	import lightTheme from 'svelte-highlight/styles/a11y-light';

	let style = '';
	let markdown: MarkdownIt;
	onMount(async () => {
		const { default: hljs } = await import('highlight.js');
		const { default: md } = await import('markdown-it');
		const { default: emoji } = await import('markdown-it-emoji');
		const { default: hljsSvelte } = await import('highlightjs-svelte');
		const { default: hljsSolidity } = await import('highlightjs-solidity');
		markdown = md({
			highlight: function (str, lang) {
				if (lang && hljs.getLanguage(lang)) {
					try {
						return (
							`<div class="p-4 my-2 bg-neutral-100 dark:bg-gray-900 rounded-md"><pre class="${classes}"><code>` +
							hljs.highlight(str, { language: lang }).value +
							'</code></pre><div>'
						);
					} catch (__) {}
				}

				return `<pre class="${classes}"><code>` + markdown.utils.escapeHtml(str) + '</code></pre>';
			}
		});

		markdown.use(emoji);
		hljsSvelte(hljs);
		hljsSolidity(hljs);
	});

	export let renderedMarkdown: string = '';
	export let value = '';
	$: style = `<style>${$theme.darkMode ? darkTheme : lightTheme}</style>`;
	const classes = 'h-auto w-full overflow-auto border-1px border-gray-300/10';

	$: renderedMarkdown = markdown.render(value as string);
</script>

<svelte:head>
	{@html style}
</svelte:head>

<slot {renderedMarkdown}>
	{@html renderedMarkdown}
</slot>
