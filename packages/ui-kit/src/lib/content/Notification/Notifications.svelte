<script lang="ts">
	import { fade } from 'svelte/transition';
	import { createEventDispatcher } from 'svelte';
	import Panel from '../Panel/Panel.svelte';
	import Notification from './Notification.svelte';
	import type { Notification as NotificationType } from './types';
	export let notifications: NotificationType[] = [];

	const dispatch = createEventDispatcher();
	function dismissAll() {
		notifications = notifications.map((notification) => ({
			...notification,
			dismissed: true
		}));
		dispatch('dismissed-all', notifications);
	}
</script>

{#if notifications.filter((n) => !n.dismissed).length > 0}
	<div transition:fade class="notifications">
		<Panel classes="gap-2 p-4 border-1px border-purple-200/20 rounded-md overflow-hidden">
			<div class="notifications__header">
				<slot name="header">
					<span>Notifications title</span>
				</slot>
				<div class="notifications__dismiss" on:click={dismissAll} on:keypress={dismissAll}>
					Dismiss all
				</div>
			</div>
			{#each notifications as notification}
				<Notification {notification}>
					<svelte:fragment slot="header">
						<span class="font-bold">{notification.title}</span>
					</svelte:fragment>

					<p>
						{notification.body}
					</p>

					<svelte:fragment slot="footer">
						<span class="text-xs">{new Date(notification.createdAt).toDateString()}</span>
					</svelte:fragment>
				</Notification>
			{/each}
		</Panel>
	</div>
{/if}

<style>
	.notifications__header {
		@apply flex justify-between items-center font-bold;
		@apply px-1;
	}

	.notifications__dismiss {
		@apply p-2 rounded-full;
		@apply text-xs text-purple-300 hover-text-purple-700 dark-text-purple-100 dark-hover-text-purple-50 cursor-pointer;
		@apply bg-gray-100 dark-bg-purple-800 dark-hover-bg-purple-700;
		@apply border-1px border-gray-300 dark-border-purple-200/20;
	}
</style>
