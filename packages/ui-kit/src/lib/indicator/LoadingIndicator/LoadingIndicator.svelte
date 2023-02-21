<script lang="ts">
	import type { Size } from '$lib/theme/types';
	export let size: Size = 'xl';

	const sizeClasses = {
		xs: 'text-xs p-1 gap-2',
		sm: 'text-sm p-2 gap-2',
		md: 'text-base px-4 py-2 gap-2',
		lg: 'text-lg px-6 py-3 gap-3',
		xl: 'text-xl px-8 py-4 gap-4',
		'2xl': 'text-2xl p-8 gap-6'
	}[size];

	export let duration: `duration-${string}` = 'duration-1s';
</script>

<div class="{sizeClasses} inline-flex items-center justify-center">
	<div class="i-tabler-loader animate-spin {duration} ease-in-out" />
	<slot />
</div>
