<script lang="ts">
	import type { FlexAlign, FlexJustify } from '$lib/unocss/types';
	import Typography from '../Typography/Typography.svelte';
	import Panel from '../Panel/Panel.svelte';
	import './Card.css';

	export let align: FlexAlign = 'items-center';
	export let justify: FlexJustify = 'justify-center';
	export let href: string | undefined = undefined;
	export let title: string | undefined = undefined;
	export let classes = '';
</script>

<Panel {href} on:click {...$$props} classes="card group {classes}">
	{#if title || $$slots.title}
		<div class="card__title">
			<slot name="title">
				<Typography el="h3">
					{title}
				</Typography>
			</slot>
		</div>
	{/if}
	{#if $$slots.default}
		<div class="card__content {align} {justify}">
			<slot />
		</div>
	{/if}
	{#if $$slots.footer}
		<div class="card__footer">
			<slot name="footer" />
		</div>
	{/if}
</Panel>
