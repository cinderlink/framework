<script lang="ts">
	import Markdown from '../Markdown/Markdown.svelte';
	import Syntax from '../Syntax/Syntax.svelte';
	export let code = '';
	export let lang = 'svelte';
	let copied = false;
	async function copyCode() {
		const copy = await import('copy-to-clipboard');
		copied = true;
		copy.default(code);
		setTimeout(() => {
			copied = false;
		}, 100);
	}
</script>

<div class="code">
	{#if lang === 'md'}
		<Markdown value={code} />
		<div
			class="i-tabler-copy code__icon"
			class:code__copied={copied}
			on:click={copyCode}
			on:keypress={copyCode}
		/>
	{:else}
		<Syntax {code} language={lang} />
		<div
			class="i-tabler-copy code__icon"
			class:code__copied={copied}
			on:click={copyCode}
			on:keypress={copyCode}
		/>
	{/if}
</div>

<style>
	.code {
		@apply relative;
	}
	.code__icon {
		@apply absolute right-1 top-3;
		@apply text-neutral-500 hover-text-neutral-600 dark-text-neutral-400 dark-hover-text-neutral-300;
		@apply cursor-pointer;
	}

	.code__copied {
		@apply text-green-500 dark-text-green-400 hover-text-green-500 dark-hover-text-green-400;
	}
</style>
