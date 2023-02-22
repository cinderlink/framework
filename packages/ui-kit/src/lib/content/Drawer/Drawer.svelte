<script lang="ts">
	import Typography from '$lib/content/Typography/Typography.svelte';
	import Panel from '../Panel/Panel.svelte';

	export let classes = '';
	export let collapsed = true;
	export let label = '';
	function toggle() {
		collapsed = !collapsed;
	}
</script>

<Panel variant="offset">
	<div class="drawer {classes}" class:drawer--collapsed={collapsed}>
		<div class="drawer__header">
			<div class="drawer__notifications-count">
				<slot name="notifications-count" />
			</div>

			<button class="drawer__toggle" on:click={toggle}>
				<slot name="toggle">
					<div class="drawer__label">
						<Typography el="h3" margin="m-0">{label}</Typography>
					</div>
					<div
						class="i-tabler-chevron-down text-2xl transform transition-transform duration-200"
						class:rotate-180={collapsed}
					/>
				</slot>
			</button>

			<div class="drawer__actions">
				<slot name="actions" />
			</div>
		</div>
		<div class="drawer__content">
			<slot />
		</div>
	</div>
</Panel>

<style>
	.drawer {
		@apply w-full;
		@apply flex flex-col gap-2;
	}
	.drawer__header {
		@apply flex justify-between items-center;
	}
	.drawer__actions {
		@apply display-none;
	}

	.drawer__header:hover .drawer__actions {
		@apply flex;
	}
	.drawer__label {
		@apply flex-1 flex items-center justify-start;
	}

	.drawer__toggle {
		@apply w-full;
		@apply flex items-center justify-start gap-4;
		@apply cursor-pointer;
	}
	.drawer__content {
		@apply w-full h-auto;
		@apply overflow-hidden;
		@apply transition-all duration-300;
	}
	.drawer--collapsed .drawer__content {
		@apply h-0;
		@apply opacity-0;
	}
</style>
