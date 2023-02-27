<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Avatar from '$lib/content/Avatar/Avatar.svelte';
	import Input from '../Input/Input.svelte';

	export let label = '';
	export let image: string | undefined = '';
	export let inputRef: HTMLInputElement | undefined = undefined;
	export let selected = false;

	console.info('ImageUpload', image, inputRef, selected);

	const dispatch = createEventDispatcher();

	async function updateImagePreview() {
		const files = inputRef?.files;
		if (!files || !files.length) return;
		const reader = new FileReader();
		reader.onload = (e) => {
			image = e.target?.result as string;
		};
		reader.readAsDataURL(files[0]);
		selected = true;
		dispatch('change', { image, selected, files });
	}
</script>

<Input
	size="sm"
	id="avatar"
	{label}
	placeholder="Avatar"
	type="file"
	inputClasses="justify-center items-center"
	bind:inputRef
	on:change={updateImagePreview}
>
	<svelte:fragment slot="preview">
		<slot name="preview">
			<Avatar image={image || undefined} size="lg" classes="bg-gray-400 dark-bg-blue-100" />
		</slot>
	</svelte:fragment>
	<div
		slot="button"
		class="input--file__button"
		on:click={() => {
			if (inputRef) inputRef.click();
		}}
		on:keypress={() => {
			if (inputRef) inputRef.click();
		}}
	>
		<div class="input--file__text">
			{#if selected}
				Change
			{:else}
				Upload
			{/if}
		</div>
		<div class="input--file__icon">
			<div class="i-tabler-pencil" />
		</div>
	</div>
</Input>

<style>
	.input--file__button {
		@apply absolute flex justify-start items-end cursor-pointer;
		@apply bg-transparent hover-bg-purple-900/70  w-full h-full rounded-full;
	}
	.input--file__text {
		@apply absolute justify-center items-center;
		@apply rounded-full text-xs font-bold text-purple-50;
		@apply w-full h-full;
		@apply hidden;
	}
	.input--file__button:hover .input--file__text {
		@apply flex;
	}
	.input--file__icon {
		@apply flex justify-center items-center;
		@apply bg-purple-50 text-purple-700 dark-bg-purple-700 dark-text-purple-50;
		@apply border-1px border-purple-700/20 dark-border-purple-50/30;
		@apply w-28px h-28px rounded-full;
		@apply text-base;
	}
</style>
