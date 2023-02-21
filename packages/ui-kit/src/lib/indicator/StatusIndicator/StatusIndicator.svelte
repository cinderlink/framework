<script lang="ts">
	import type { Size, Status } from '$lib/theme/types';

	export let status: Status = 'info';
	export let size: Size = 'xs';
	export let classes = '';
</script>

<div class="status-indicator status-indicator--{status} status-indicator--{size} {classes}">
	<slot />
</div>

<style>
	.status-indicator {
		@apply inline-flex items-center justify-center rounded-full;
	}
	.status-indicator--xs {
		@apply w-2 h-2;
	}
	.status-indicator--sm {
		@apply w-3 h-3;
	}
	.status-indicator--md {
		@apply w-4 h-4;
	}
	.status-indicator--lg {
		@apply w-5 h-5;
	}
	.status-indicator--xl {
		@apply w-6 h-6;
	}
	.status-indicator--xxl {
		@apply w-7 h-7;
	}
	.status-indicator--success {
		@apply bg-green-600 dark-(bg-green-400);
	}
	.status-indicator--warning {
		@apply bg-yellow-500 dark-(bg-yellow-400);
	}
	.status-indicator--error {
		@apply bg-red-500 dark-(bg-red-400);
	}
	.status-indicator--info {
		@apply bg-blue-500 dark-(bg-blue-400);
	}
	.status-indicator--neutral {
		@apply bg-gray-500 dark-(bg-gray-400);
	}
</style>
