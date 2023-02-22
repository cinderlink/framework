<script lang="ts">
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { createEventDispatcher } from 'svelte';
	import type { Notification as NotificationType } from './types';
	export let notification: NotificationType;
	export let classes = '';

	const dispatch = createEventDispatcher();
	function onDismiss() {
		notification.dismissed = true;
		dispatch('dismissed', notification);
	}

	function goToLink() {
		onDismiss();
		if (notification.link) goto(notification.link);
	}
</script>

{#if !notification.dismissed}
	<div transition:fly={{ x: -100 }} class="notification {classes}">
		<div class="notification__header">
			<slot name="header" />
			<i class="icon i-tabler-x" on:click={onDismiss} on:keypress={goToLink} />
		</div>
		<div class="notification__body">
			<slot />
		</div>
		<div class="notification__footer">
			<slot name="footer" />
			{#if notification.link}
				<i class="icon i-tabler-external-link" on:click={goToLink} on:keypress={goToLink} />
			{/if}
		</div>
	</div>
{/if}

<style>
	.notification {
		@apply w-full shadow-md;
		@apply flex flex-col border-1px border-purple-200/20 rounded-md overflow-hidden;
	}
	.notification__header {
		@apply flex justify-between items-center px-4 py-2 bg-gray-100 dark-bg-purple-800;
	}
	.notification__body {
		@apply flex-1 px-4 py-2;
	}
	.notification__footer {
		@apply flex justify-between items-center text-xs text-gray-500;
		@apply px-4 py-2 bg-gray-100 dark-bg-purple-800;
	}

	.icon {
		@apply text-purple-300 hover-(text-purple-700) dark-(text-purple-100) dark-hover-(text-purple-50);
		@apply text-lg cursor-pointer;
	}
</style>
