<script context="module" lang="ts">
	import type { StoryDef } from '$lib/ddl/stories';
	export const story: StoryDef = {
		group: 'interactive',
		id: 'notification',
		title: 'Notification',
		description: 'Notification component'
	};
</script>

<script lang="ts">
	import Notification from '../Notification/Notification.svelte';
	import type { Notification as NotificationType } from './types';

	import Panel from '../Panel/Panel.svelte';
	import Typography from '../Typography/Typography.svelte';
	import Notifications from './Notifications.svelte';
	import NotificationsIcon from './NotificationsIcon.svelte';
	import Input from '$lib/interactive/Input/Input.svelte';
	import Syntax from '../Syntax/Syntax.svelte';

	let notification: NotificationType = {
		id: '1',
		title: 'Notification title',
		type: 'connections',
		body: 'Lorem ipsum dolor, sit amet consectetur adipisicing elit. Corporis officiis adipisci ipsam quod, harum impedit nihil voluptate qui provident quisquam tempore, esse odio odit fugiat quis minima facere',
		dismissed: false,
		link: 'link/to/content',
		createdAt: Date.now()
	};

	let notifications: NotificationType[] = [
		{
			id: '1',
			title: 'Notification title 1',
			type: 'connections',
			body: 'content 1',
			dismissed: false,
			link: 'link/to/content-1',
			createdAt: Date.now()
		},
		{
			id: '2',
			title: 'Notification title 2',
			type: 'connections',
			body: 'content 2',
			dismissed: false,
			link: 'link/to/content-2',
			createdAt: Date.now()
		},
		{
			id: '3',
			title: 'Notification title 3',
			type: 'connections',
			body: 'content 3',
			dismissed: false,
			link: 'link/to/content-3',
			createdAt: Date.now()
		}
	];

	$: count = notifications.filter((n) => !n.dismissed).length;
</script>

<svelte:head>
	<title>{story.title} - Interactive Components - @candor/ui-kit</title>
</svelte:head>

<Typography>{story.title}</Typography>

<div class="story">
	<Panel>
		<Typography el="h3">Notifications Icon</Typography>
		<div class="flex flex-row gap-4 items-center">
			<Input
				id="notifications-count"
				label="Notifications count"
				type="number"
				width="w-1/4"
				bind:value={count}
			/>
			<NotificationsIcon {count} />
		</div>
		<hr class="my-4" />
		<Typography el="h3">Usage</Typography>
		<Syntax code={`<NotificationsIcon {count} />`} />
	</Panel>
	<Panel>
		<Typography el="h3">Notification</Typography>
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
		<hr class="my-4" />
		<Typography el="h3">Usage</Typography>
		<Syntax
			code={`<Notification {notification}>
	<svelte:fragment slot="header">
		<span class="font-bold">{notification.title}</span>
	</svelte:fragment>
	<p>
		{notification.body}
	</p>
	<svelte:fragment slot="footer">
		<span class="text-xs">
			{new Date(notification.createdAt).toDateString()}
		</span>
	</svelte:fragment>
</Notification>`}
		/>
	</Panel>

	<Panel>
		<Typography el="h3">Notifications List</Typography>
		<Notifications {notifications} />
		<hr class="my-4" />
		<Typography el="h3">Usage</Typography>
		<Syntax
			code={`\<script\>
let notifications= [
	{
		id: '1',
		title: 'Notification title 1',
		type: 'connections',
		body: 'content 1',
		dismissed: false,
		link: 'lint/to/content-1',
		createdAt: Date.now()
	},
	{
		id: '2',
		title: 'Notification title 2',
		type: 'connections',
		body: 'content 2',
		dismissed: false,
		link: 'lint/to/content-2',
		createdAt: Date.now()
	},
	{
		id: '3',
		title: 'Notification title 3',
		type: 'connections',
		body: 'content 3',
		dismissed: false,
		link: 'lint/to/content-3',
		createdAt: Date.now()
	}
];
\</script\>

<Notifications {notifications} />`}
		/>
	</Panel>
</div>
