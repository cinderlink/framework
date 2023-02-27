<script lang="ts">
	import {
		Avatar,
		ListItem,
		Button,
		Input,
		OnlineStatusIndicator,
		LoadingIndicator,
		Markdown
	} from '@candor/ui-kit';
	import { goto } from '$app/navigation';
	import CidImage from '$lib/dapp/CIDImage.svelte';
	import { dapp } from '$lib/dapp/store';
	import type { SocialClientPlugin, SocialClientEvents } from '@candor/plugin-social-client';
	import type { SocialChatMessageRecord, SocialUser } from '@candor/plugin-social-core';
	import { formatRelative } from 'date-fns';
	import type { PageData } from './$types';
	import { onMount, afterUpdate, beforeUpdate, tick } from 'svelte';
	import { v4 as uuid } from 'uuid';

	export let data: PageData;

	let autoscroll: boolean | undefined = undefined;
	let chatContainer: HTMLElement | undefined = undefined;
	let messages: SocialChatMessageRecord[] = data.messages || [];
	let value: string = '';
	let error: string | undefined = undefined;
	let sending = false;
	let plugin: SocialClientPlugin | undefined = $dapp.client?.getPlugin(
		'socialClient'
	) as SocialClientPlugin;
	$: connected = data.user ? $dapp.client?.peers.hasPeerByDID(data.user.did) : false;

	$dapp.client?.on('/peer/connect', (peer) => {
		console.info(`peer connected: ${peer.did}`);
		if (peer.did === data.user?.did) {
			connected = true;
		}
	});

	$dapp.client?.on('/peer/disconnect', (peer) => {
		if (peer.did === data.user?.did) {
			connected = false;
		}
	});

	let localUser: SocialUser | undefined = undefined;
	onMount(async () => {
		if (!connected) {
			console.info('not connected to user', data.user, $dapp.client?.peers.getPeers());
		}

		localUser = await plugin?.getLocalUser();

		plugin?.table<SocialUser>('users').on('/record/inserted', async (record) => {
			if (record.did === data.user?.did) {
				data.user = record;
			}
		});

		plugin?.table<SocialUser>('users').on('/record/updated', async (record) => {
			if (record.did === data.user?.did) {
				data.user = record;
			}
		});

		plugin?.table<SocialUser>('users').on('/record/deleted', async (record) => {
			if (record.did === data.user?.did) {
				data.user = undefined;
			}
		});

		plugin
			?.table<SocialChatMessageRecord>('chat_messages')
			.on('/record/inserted', async (record) => {
				if (data.user?.did && $dapp.client?.id) {
					messages =
						(await plugin
							?.table<SocialChatMessageRecord>('chat_messages')
							.query()
							.where('to', 'in', [$dapp.client?.id, data.user.did])
							.where('from', 'in', [data.user.did, $dapp.client?.id])
							.select()
							.orderBy('createdAt', 'desc')
							.limit(1000)
							.execute()
							.then((res) => res.all())) || [];
				}
			});
	});

	async function onSend() {
		if (sending || !data.user) return;
		sending = true;
		const requestId = uuid();
		const tmpMessage = {
			requestId,
			from: $dapp.client?.id,
			to: data.user.did,
			message: value,
			createdAt: Date.now()
		} as SocialChatMessageRecord;
		messages = [...messages, tmpMessage];
		value = '';

		const message = await plugin?.sendChatMessage(tmpMessage);
		sending = false;
	}
</script>

{#if !data.user}
	{#await goto('/feed')}
		<LoadingIndicator>User not found. Redirecting...</LoadingIndicator>
	{/await}
{:else}
	{#key data.user.did}
		<div class="chat relative">
			<div class="chat__header">
				<section class="flex gap-4 items-center">
					<h1>{data.user.name}</h1>
					<OnlineStatusIndicator size="sm" status={connected ? 'online' : 'offline'} />
					<Button
						variant="green"
						rounded="rounded-sm"
						href="/profile/{data.user.did}"
						classes="ml-2"
						size="xs">View Profile</Button
					>
				</section>
			</div>
			<div class="chat__body">
				<div class="chat__messages" bind:this={chatContainer}>
					{#each messages.sort((a, b) => b.createdAt - a.createdAt) as message}
						{@const user = message.from === data.user?.did ? data.user : localUser}
						{#key message}
							<ListItem classes="snap-end" style="flex flex-row justify-between items-start">
								<a class="mx-2 text-center" href="/profile/{data.user?.did}">
									<h4 class="text-sm font-sans text-purple-500 dark-(text-green-400) mb-1">
										{user?.name}
									</h4>
									<Avatar size="sm" status="online">
										<svelte:fragment slot="image">
											{#if user?.avatar}
												<CidImage cid={user.avatar} />
											{/if}
										</svelte:fragment>
									</Avatar>
								</a>
								<div class="flex flex-col justify-start items-start px-4 flex-1 overflow-hidden">
									<Markdown value={message.message} />
								</div>
								<div class="px-4 text-xs text-purple-900 dark-(text-purple-200) whitespace-nowrap">
									{formatRelative(new Date(message.createdAt), new Date())}
								</div>
							</ListItem>
						{/key}
					{/each}
				</div>
			</div>
			<div class="chat__footer">
				<form id="chat-input-form" on:submit|preventDefault={onSend} disabled={sending}>
					<div class="chat__input">
						<Input
							id="chat-input"
							variant="default"
							{error}
							size="sm"
							type="markdown"
							emoji={true}
							bind:value
							on:keypress={(e) => {
								if (e.key === 'Enter' && e.shiftKey) {
									value += '\n';
								} else if (e.key === 'Enter' && !e.shiftKey) {
									onSend();
								}
							}}
						/>
					</div>
					<div class="chat__send">
						<Button
							variant="green"
							id="chat-button"
							classes={error ? 'error' : ''}
							size="md"
							on:click={onSend}>Send</Button
						>
					</div>
				</form>
			</div>
		</div>
	{/key}
{/if}

<style>
	.chat {
		@apply flex flex-col h-full w-full overflow-hidden;
	}

	.chat__header {
		@apply px-4 py-2 absolute z-10 w-full top-0 left-0 flex items-center gap-4;
		@apply bg-purple-50/80 text-purple-500 dark-(bg-purple-800/80 text-purple-50);
		@apply flex justify-between;
	}

	.chat__header h1 {
		@apply text-4xl font-bold;
	}

	.chat__body {
		@apply flex-1 flex flex-col gap-2 pt-12 overflow-hidden;
	}

	.chat__messages {
		@apply overflow-auto h-auto flex flex-col-reverse gap-2;
	}

	.chat__footer {
		@apply bg-purple-100 border-t-4 border-purple-50 dark-(bg-purple-800 border-purple-200/20);
	}

	.chat__footer #chat-input-form {
		@apply flex items-center gap-2;
	}

	.chat__input {
		@apply flex-1 py-2 pl-4 pr-0;
	}

	.chat__send {
		@apply flex-none pl-0 py-2 pr-4;
	}

	:global(#chat-button) {
		@apply border-0;
	}
</style>
