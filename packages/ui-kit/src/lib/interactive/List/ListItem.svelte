<script lang="ts">
	import Panel from '$lib/content/Panel/Panel.svelte';
	import { createEventDispatcher } from 'svelte';
	export let data: Record<string, any> | undefined = undefined;
	export let href: string | undefined = undefined;
	export let el = href ? 'a' : 'div';
	export let interactive: boolean = el !== 'div';
	export let style = 'flex flex-row gap-2 items-center justify-between w-full whitespace-nowrap';
	export let classes = '';

	const dispatch = createEventDispatcher();

	function handleClick() {
		dispatch('click', data);
	}
</script>

<Panel
	this={el}
	{...href ? { href } : {}}
	{interactive}
	on:click={handleClick}
	on:keypress={handleClick}
	{...$$restProps}
>
	<div class="{style} {classes}">
		<slot />
	</div>
</Panel>
