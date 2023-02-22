<script lang="ts">
	import Emoji from '$lib/content/Emoji/Emoji.svelte';
	import type { Size } from '$lib/theme/types';
	import Button from '../Button/Button.svelte';

	export let id: string;
	export let name: string | undefined = undefined;
	export let label: string | undefined = undefined;
	export let error: string | undefined = undefined;
	export let type: 'text' | 'password' | 'number' | 'email' | 'textarea' | 'file' | 'markdown' =
		'text';
	export let disabled = false;
	export let classes = '';
	export let inputClasses = 'justify-between items-center';

	export let value: string | number | undefined = '';
	export let files: FileList | undefined = undefined;
	export let placeholder = '';
	export let width: `w-${string}` | 'w-full' = 'w-full';
	export let variant: 'default' | 'inverted' | 'custom' = 'default';
	export let size: Size = 'md';
	export let readonly = false;
	export let autocomplete: 'on' | 'off' = 'off';
	export let emoji = false;

	export let imgRef: HTMLImageElement | undefined = undefined;
	export let inputRef: HTMLInputElement | undefined = undefined;
	export let textareaRef: HTMLTextAreaElement | undefined = undefined;

	let empty = true;
	$: empty = value === '';
</script>

<div
	class="input__container {width} input--{type} input--{size} input--{variant} {classes}"
	class:input--empty={empty}
	class:input--error={error}
>
	{#if $$slots.label || label}<slot name="label"><label for={id}>{label}</label></slot>{/if}
	<div class="input__wrapper input__wrapper--{size} {inputClasses} {width}">
		<slot name="prepend" />
		{#if type === 'password'}
			<input
				{readonly}
				{id}
				{name}
				{disabled}
				type="password"
				bind:value
				{placeholder}
				class="input"
			/>
		{:else if type === 'number'}
			<input
				{readonly}
				{id}
				{name}
				{disabled}
				type="number"
				bind:value
				{placeholder}
				class="input"
			/>
		{:else if type === 'email'}
			<input
				{readonly}
				{id}
				{name}
				{disabled}
				type="email"
				bind:value
				{placeholder}
				class="input"
			/>
		{:else if type === 'text'}
			<input
				bind:this={inputRef}
				{readonly}
				{id}
				{name}
				{disabled}
				{autocomplete}
				type="text"
				on:focus
				on:blur
				bind:value
				{placeholder}
				class="input"
			/>
			{#if emoji}
				<Emoji
					on:selected={(e) => {
						value += e.detail;
						inputRef?.focus();
					}}
				/>
			{/if}
		{:else if type === 'textarea'}
			<textarea {readonly} {id} {name} {disabled} bind:value {placeholder} class="input" />
			{#if emoji}
				<Emoji on:selected={(e) => (value += e.detail)} />
			{/if}
		{:else if type === 'file'}
			<input
				bind:this={inputRef}
				on:change
				{id}
				{name}
				{disabled}
				type="file"
				bind:value
				bind:files
				{placeholder}
				class="hidden"
			/>
			<div class="input__preview">
				<slot name="preview">
					<img bind:this={imgRef} alt="Upload preview" />
				</slot>
				<slot name="button">
					<div class="p-2">
						<Button
							type="button"
							rounded="rounded-lg"
							{size}
							on:click={() => {
								if (inputRef) inputRef.click();
							}}
						>
							<slot name="button-text">
								<div class="i-tabler-upload" />
								Upload
							</slot>
						</Button>
					</div>
				</slot>
			</div>
		{:else if type === 'markdown'}
			<textarea
				bind:this={textareaRef}
				rows="1"
				{readonly}
				{id}
				{name}
				{disabled}
				bind:value
				on:keypress
				{placeholder}
				class="input"
			/>
			{#if emoji}
				<Emoji
					on:selected={(e) => {
						value += e.detail;
						textareaRef?.focus();
					}}
				/>
			{/if}
		{/if}
		<slot name="append" />
	</div>
	{#if $$slots.error || error}<slot name="error"><span class="error">{error}</span></slot>{/if}
</div>

<style>
	.input__container {
		@apply flex flex-col gap-2 items-start justify-center;
	}
	.input__container label {
		@apply font-sans font-bold text-md text-purple-900 dark-(text-purple-50);
	}
	:global(.surface.input__wrapper) {
		@apply flex gap-2 items-center justify-center p-0;
	}
	.input {
		@apply w-full;
	}
	input.input {
		@apply font-sans font-normal text-md b-none outline-none bg-transparent;
	}
	textarea.input {
		@apply font-sans font-normal text-md b-none outline-none resize-none bg-transparent;
	}
	.input__wrapper {
		@apply rounded-lg px-24px py-16px flex flex-row gap-2 text-xl w-full border-4;
	}

	.input__preview {
		@apply relative flex flex-col gap-2 items-center justify-center;
	}
	.input__wrapper--xs {
		@apply px-8px py-4px;
	}
	.input__wrapper--sm {
		@apply px-12px py-8px;
	}
	.input__wrapper--md {
		@apply px-16px py-12px;
	}
	.input__wrapper--lg {
		@apply px-20px py-16px;
	}
	.input__wrapper--xl {
		@apply px-24px py-20px;
	}

	.input--default:not(.input--file) .input__wrapper {
		@apply bg-purple-50 text-purple-900 border-purple-100;
		@apply dark-(bg-purple-900 text-purple-50 border-purple-100);
	}
	.input--invert:not(.input--file) .input__wrapper {
		@apply bg-purple-900 text-purple-50 border-purple-100;
		@apply dark-(bg-purple-50 text-purple-900 border-purple-100);
	}

	.input--file .input__wrapper {
		@apply border-none;
	}

	.input__wrapper:focus-within,
	.input__wrapper:hover {
		@apply border-purple-800;
		@apply dark-(border-purple-200);
	}
	.error {
		@apply w-full p-2;
		@apply font-sans font-normal text-(base red-600 left);
	}

	/* Size */
	.input__container.input--xs label {
		@apply text-xs;
	}
	.input__container.input--xs .input {
		@apply text-xs;
	}

	.input__container.input--sm label {
		@apply text-sm;
	}
	.input__container.input--sm .input {
		@apply text-sm;
	}

	.input__container.input--md label {
		@apply text-md;
	}
	.input__container.input--md .input {
		@apply text-md;
	}

	.input__container.input--lg label {
		@apply text-lg;
	}
	.input__container.input--lg .input {
		@apply text-lg;
	}

	.input__container.input--xl label {
		@apply text-xl;
	}

	.input__container.input--xl .input {
		@apply text-xl;
	}

	.input__container.input--lg .input__wrapper {
		@apply text-xl px-4 py-3;
	}
</style>
