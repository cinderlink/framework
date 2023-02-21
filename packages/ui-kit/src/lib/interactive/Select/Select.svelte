<script lang="ts">
	import type { FlexAlign, FlexJustify } from '$lib/unocss/types';
	import { createEventDispatcher } from 'svelte';
	import Dropdown from '../Dropdown/Dropdown.svelte';
	import type { Option } from '../Dropdown/types';

	export let align: FlexAlign = 'items-start';
	export let justify: FlexJustify = 'justify-start';
	export let selected: Option = { label: 'Select', value: 'select' };
	export let variant: 'default' | 'dark' | 'light' | 'pink' | 'green' | 'blue' | 'yellow' =
		'default';
	export let square = false;
	export let options: Option[] = [];

	export let toggle: ((value?: boolean) => void) | undefined = undefined;

	const dispatch = createEventDispatcher();

	function onSelect(option: Option) {
		selected = option;
		toggle?.(false);
		dispatch('selected', option);
	}
</script>

<Dropdown {...$$restProps} {variant} label={selected.label} let:toggle>
	{#if options.length > 0}
		<ul class="dropdown__list dropdown__list--{variant}" class:dropdown__list--square={square}>
			{#each options as option}
				<li
					class="{align} {justify}"
					on:click={() => onSelect(option)}
					on:keypress={() => onSelect(option)}
					class:active={option.value === selected.value}
				>
					{#if option.icon}
						<div class="list__icon {option.icon}" />
					{/if}
					{option.label}
				</li>
			{/each}
		</ul>
	{/if}
</Dropdown>
