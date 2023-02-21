<script lang="ts">
	import type { Option } from './types';
	import type { Size } from '$lib/theme/types';
	import type { TypographyElement } from '$lib/content/Typography/types';
	import { clickoutside } from '$lib/actions';
	import { createEventDispatcher } from 'svelte';
	import { slide } from 'svelte/transition';
	import Typography from '$lib/content/Typography/Typography.svelte';
	import './Dropdown.css';

	export let id: string = 'dropdown';
	export let label: string | undefined = undefined;
	export let type: 'select' | 'dropdown' = 'dropdown';
	export let square: boolean = false;
	export let variant: 'default' | 'dark' | 'light' | 'pink' | 'green' | 'blue' | 'yellow' =
		'default';
	export let align: 'left' | 'right' = 'left';
	export let size: Size = 'md';
	export let width: `w-${string}` = 'w-auto';
	export let toggled = false;
	export let icon: string | false = 'i-tabler-chevron-down';
	export let classes = '';
	export let selected: Option = { label: 'Select', value: 'select' };
	const elSizes = {
		xs: 'p',
		sm: 'h6',
		md: 'h4',
		lg: 'h3',
		xl: 'h2',
		'2xl': 'h1'
	};
	export let el = (elSizes[size as keyof typeof elSizes] as TypographyElement) || 'p';

	const dispatch = createEventDispatcher();
	function onToggle(val: boolean) {
		toggled = val;
		dispatch('toggled', toggled);
	}

	function onKeyPress(event: KeyboardEvent) {
		if (!toggled && event.key === 'Enter') {
			onToggle(true);
		} else if (event.key === 'Escape') {
			onToggle(false);
		}
		dispatch('keydown', event);
	}
</script>

<div {id} class="dropdown {width}">
	{#if label && type === 'select'}
		<Typography {el}>{label}</Typography>
	{/if}
	<div
		use:clickoutside
		on:clickoutside={() => {
			onToggle(false);
		}}
		class="dropdown__container dropdown--{size} {width} {classes}"
	>
		<div
			class="dropdown__select dropdown__select--{variant}"
			class:dropdown__select--square={square}
			on:click={() => onToggle(!toggled)}
			on:keypress={onKeyPress}
		>
			<slot name="button" toggle={onToggle}>
				<div class="dropdown__selected">{type === 'select' ? selected.label : label}</div>
				<div class="dropdown__icon {icon}" class:dropdown__icon--rotate={toggled} />
			</slot>
		</div>
		{#if toggled}
			<div
				transition:slide={{ duration: 200 }}
				class="dropdown__menu dropdown__menu--{align} {size}"
			>
				<slot toggle={onToggle} />
			</div>
		{/if}
	</div>
</div>
