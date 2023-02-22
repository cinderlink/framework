<script lang="ts">
	import { fade } from 'svelte/transition';

	export let image: string | undefined = undefined;
	export let name: string | undefined = undefined;
	export let status: 'online' | 'offline' | 'busy' | 'away' | undefined = undefined;
	export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
	export let classes = '';
</script>

<div class="avatar avatar--{size} {status ? `avatar--${status}` : ''} {classes}">
	<slot name="image">
		{#if image}
			<img src={image} alt={name} class="avatar__image" transition:fade />
		{/if}
	</slot>

	{#if $$slots.corner}
		<div class="avatar__badge">
			<slot name="corner" />
		</div>
	{/if}
</div>

<style>
	.avatar {
		@apply rounded-full block relative shadow;
		@apply hover-(scale-102 rotate-1 shadow-lg) transition-transform duration-300 transform-gpu;
	}
	.avatar :global(img) {
		@apply rounded-full object-cover w-full h-full;
	}
	.avatar--sm {
		@apply w-12 h-12;
	}
	.avatar--md {
		@apply w-16 h-16;
	}
	.avatar--lg {
		@apply w-20 h-20;
	}
	.avatar--xl {
		@apply w-24 h-24;
	}

	.avatar--sm.avatar--online {
		@apply border-3 border-green-500;
	}

	.avatar--md.avatar--online {
		@apply border-5 border-green-500;
	}

	.avatar--lg.avatar--online {
		@apply border-7 border-green-500;
	}

	.avatar--xl.avatar--online {
		@apply border-9 border-green-500;
	}

	.avatar--sm.avatar--offline {
		@apply border-3 border-gray-500;
	}

	.avatar--md.avatar--offline {
		@apply border-5 border-gray-500;
	}

	.avatar--lg.avatar--offline {
		@apply border-7 border-gray-500;
	}

	.avatar--xl.avatar--offline {
		@apply border-9 border-gray-500;
	}

	.avatar--sm.avatar--busy {
		@apply border-3 border-red-500;
	}

	.avatar--md.avatar--busy {
		@apply border-5 border-red-500;
	}

	.avatar--lg.avatar--busy {
		@apply border-7 border-red-500;
	}

	.avatar--xl.avatar--busy {
		@apply border-9 border-red-500;
	}

	.avatar--sm.avatar--away {
		@apply border-3 border-yellow-500;
	}

	.avatar--md.avatar--away {
		@apply border-5 border-yellow-500;
	}

	.avatar--lg.avatar--away {
		@apply border-7 border-yellow-500;
	}

	.avatar--xl.avatar--away {
		@apply border-9 border-yellow-500;
	}

	.avatar__badge {
		@apply absolute top-0 right-0;
	}
</style>
