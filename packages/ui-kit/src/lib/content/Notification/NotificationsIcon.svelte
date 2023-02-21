<script lang="ts">
	import NotificationsCount from './NotificationsCount.svelte';

	export let icon: string = 'i-tabler-bell';
	export let count: number = 0;
</script>

<div class="notifications-icon" on:click on:keypress>
	<div class="notifications-icon__icon {icon}" on:click on:keypress />
	<NotificationsCount {count} />
</div>

<style>
	.notifications-icon {
		@apply relative inline-block;
	}
	.notifications-icon__icon {
		@apply text-purple-300 hover-text-purple-700 dark-text-purple-100 dark-hover-text-purple-50;
		@apply text-2xl cursor-pointer;
	}

	.notifications-icon :global(.notifications-count) {
		@apply absolute -top-1 -left-1;
	}
</style>
