<script lang="ts">
	import hljs from 'highlight.js';
	import type MarkdownIt from 'markdown-it';
	import md from 'markdown-it';
	import emoji from 'markdown-it-emoji';
	import darkTheme from 'highlight.js/styles/atom-one-dark.css?inline';
	import lightTheme from 'highlight.js/styles/atom-one-light.css?inline';
	import theme from '$lib/theme/store';
	export let renderedMarkdown: string = '';
	export let value = '';

	$: style = `<style>${$theme.darkMode ? darkTheme : lightTheme}</style>`;
	const classes =
		'p-4 my-2 bg-neutral-100 dark:bg-gray-900 rounded-md overflow-auto w-full border-1px border-gray-300/10';
	const markdown: MarkdownIt = md({
		highlight: function (str, lang) {
			if (lang && hljs.getLanguage(lang)) {
				try {
					return (
						`<pre class="${classes}"><code>` +
						hljs.highlight(str, { language: lang }).value +
						'</code></pre>'
					);
				} catch (__) {}
			}

			return `<pre class="${classes}"><code>` + markdown.utils.escapeHtml(str) + '</code></pre>';
		}
	});

	markdown.use(emoji);
	$: renderedMarkdown = markdown.render(value as string);
</script>

<svelte:head>
	{@html style}
</svelte:head>

<slot {renderedMarkdown}>
	{@html renderedMarkdown}
</slot>
