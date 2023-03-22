<script lang="ts">
	import { clickoutside } from '$lib/actions';
	import type MarkdownIt from 'markdown-it';
	import { createEventDispatcher, onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import emojiList from '../../emoji';
	import Panel from '../Panel/Panel.svelte';

	let showEmojis = false;

	const dispatch = createEventDispatcher();
	let md: MarkdownIt;

	onMount(async () => {
		const { default: markdown } = await import('markdown-it');
		const { default: emoji } = await import('markdown-it-emoji');

		md = markdown();
		md.use(emoji);

		md.renderer.rules.emoji = function (token, idx) {
			return token[idx].content;
		};
	});

	function onClick(event: MouseEvent | KeyboardEvent) {
		const target = event.target as HTMLElement;
		const emoji = target.innerText;
		showEmojis = false;
		dispatch('selected', emoji);
	}

	function toggleEmojis() {
		showEmojis = !showEmojis;
	}
</script>

<div use:clickoutside on:clickoutside={() => (showEmojis = false)} class="emojis__container">
	{#if showEmojis && md}
		<div transition:scale>
			<Panel el="div" classes="emojis">
				{#each Object.keys(emojiList) as key}
					<span class="emoji emoji__{key}" on:click={onClick} on:keypress={onClick}>
						{@html md.render(`:${key}:`)}
					</span>
				{/each}
			</Panel>
		</div>
	{/if}
	<div class="emojis__btn" on:click={toggleEmojis} on:keypress={toggleEmojis}>
		<span class="text-2xl text-gray-500">
			{@html md.render(':smiley:')}
		</span>
	</div>
</div>

<style>
	.emojis__container {
		@apply relative;
	}
	.emojis__btn {
		@apply cursor-pointer outline-none;
	}
	.emojis__container :global(.emojis) {
		@apply absolute bottom-full right-0 mb-2;
		@apply flex flex-row flex-wrap justify-around;
		@apply overflow-y-auto shadow-lg w-300px h-400px border-1px border-gray-100/20;
	}
	.emoji {
		@apply text-3xl px-2 py-1 cursor-pointer;
	}
	.emoji:hover {
		@apply bg-purple-900;
	}
</style>
