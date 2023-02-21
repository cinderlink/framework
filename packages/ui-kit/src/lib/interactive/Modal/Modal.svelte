<script lang="ts">
	import { fade } from 'svelte/transition';

	export let visible = false;
</script>

{#if visible}
	<div class="modal__backdrop" transition:fade>
		<div class="modal__inner">
			<div class="modal__header">
				<slot name="header" />
			</div>
			<div class="modal__content">
				<slot />
			</div>
			<div class="modal__footer">
				<slot name="footer" />
			</div>
		</div>
	</div>
{/if}

<style>
	.modal__backdrop {
		@apply fixed inset-0 z-50 flex items-center justify-center;
		@apply bg-black bg-opacity-80;
		@apply backdrop-filter backdrop-blur-sm;
	}
	.modal__inner {
		@apply relative flex flex-col gap-4 w-full h-full items-center justify-center;
		@apply max-w-2xl max-h-2xl m-auto;
		@apply text-white;
	}
	.modal__header {
		@apply flex flex-row items-center justify-between w-full;
	}
	.modal__content {
		@apply flex flex-col items-start justify-start w-full;
		@apply px-6 py-4;
		@apply bg-white rounded-lg shadow-md text-neutral-900;
	}
	.modal__footer {
		@apply flex flex-row items-center justify-end w-full;
	}
</style>
