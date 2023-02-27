<script lang="ts">
	import Panel from '$lib/content/Panel/Panel.svelte';
	import Button from '$lib/interactive/Button/Button.svelte';
	import Dropdown from '$lib/interactive/Dropdown/Dropdown.svelte';
	import List from '$lib/interactive/List/List.svelte';
	import ListItem from '$lib/interactive/List/ListItem.svelte';
	import { theme } from '$lib/theme/store';
	import type { Size } from '$lib/unocss';

	export let entityTypeId: number;
	export let entityId: number;
	export let label: string;
	export let size: Size;
	export let align: 'left' | 'right' = 'left';

	interface AttestationOption {
		key: string;
		label: string;
		value?: number;
		valueFn?: () => number;
	}

	export let options: AttestationOption[] = [];

	let attestationKey: string;
	let attestationValue: number;

	function selectAttestationOption(option: AttestationOption) {
		console.info('Selected attestation', option);
	}
</script>

<Dropdown
	id={`attestation-dropdown-${entityTypeId}-${entityId}`}
	{label}
	{size}
	{align}
	{...$$restProps}
>
	<List variant={$theme.darkMode ? 'dark' : 'light'} size="sm">
		{#each options as option}
			<Button
				classes="whitespace-nowrap"
				on:click={() => selectAttestationOption(option)}
				size="sm"
			>
				{option.label}
			</Button>
		{/each}
	</List>
</Dropdown>
