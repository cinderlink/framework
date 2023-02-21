<script lang="ts">
	import { dapp } from '$lib/dapp/store';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { SocialClientEvents, SocialClientPlugin } from '@candor/plugin-social-client';
	import { LoadingIndicator, Logo, Button, Input, Avatar, Typography, web3 } from '@candor/ui-kit';
	import ThemeToggle from '$lib/components/theme/ThemeToggle.svelte';

	let loading = true;

	let username = '';
	let bio = '';
	let image: string | undefined = '';
	let imageCid: string | null = null;
	let inputRef: HTMLInputElement | undefined = undefined;

	let social: SocialClientPlugin | undefined = undefined;
	let socialReady = false;
	onMount(async () => {
		if (!$web3.connected || !$dapp.connected) {
			return goto('/connect');
		}

		social = $dapp.client?.getPlugin<SocialClientEvents, SocialClientPlugin>('socialClient');
		if (social?.ready) {
			await onSocialReady();
		} else {
			social?.on('ready', async () => {
				await onSocialReady();
			});
		}
	});

	async function onSocialReady() {
		socialReady = true;
		if (social && social.name && social.name !== 'guest') {
			await social.publishAnnounceMessage();
			return goto('/profile');
		}
		loading = false;
	}

	let canSubmit = false;
	$: canSubmit = username.length && image?.length ? true : false;

	async function updateImagePreview() {
		const files = inputRef?.files;
		if (!files || !files.length) return;
		const reader = new FileReader();
		reader.onload = (e) => {
			image = e.target?.result as string;
		};
		reader.readAsDataURL(files[0]);
		const addResult = await $dapp.client?.ipfs.add(files[0] as Blob, { pin: true });
		if (addResult && addResult.cid) imageCid = addResult.cid.toString();
	}

	async function onSubmit() {
		console.info('submit', social, username, bio);
		if (!social) return;
		if (username === 'demo') return;
		console.info(`social profile updated, publishing`);
		await social.setState({
			name: username,
			bio,
			avatar: imageCid || image || ''
		});
		await onSocialReady();
		await social?.publishAnnounceMessage();
		localStorage.setItem('candor:hasAccount', 'true');
		goto('/profile');
	}
</script>

{#if loading}
	<LoadingIndicator>Loading profile details...</LoadingIndicator>
{:else}
	<div class="flex justify-end">
		<ThemeToggle />
	</div>
	<div class="logo">
		<Logo />
	</div>
	<Typography el="h1" classes="font-black text-center">Configure Profile</Typography>

	<form class="flex flex-col gap-2" on:submit|preventDefault={onSubmit}>
		<Input
			size="sm"
			id="avatar"
			label="Avatar"
			placeholder="Avatar"
			type="file"
			inputClasses="justify-center items-center"
			bind:inputRef
			on:change={updateImagePreview}
		>
			<div slot="preview">
				<Avatar image={image || undefined} size="lg" classes="bg-gray-400 dark-bg-blue-100" />
			</div>
			<div
				slot="button"
				class="input--file__button"
				on:click={() => {
					if (inputRef) inputRef.click();
				}}
				on:keypress={() => {
					if (inputRef) inputRef.click();
				}}
			>
				<div class="input--file__text">
					{#if imageCid}
						Change
					{:else}
						Upload
					{/if}
				</div>
				<div class="input--file__icon">
					<div class="i-tabler-pencil" />
				</div>
			</div>
		</Input>
		<Input
			size="sm"
			id="username"
			label="Username"
			placeholder="Your cool username"
			bind:value={username}
		/>
		{#if username.length < 3}
			<Typography el="caption" classes="flex text-neutral-700 dark-text-neutral-400" margin="m-0"
				>Username must be at least 3 characters</Typography
			>
		{:else if username.length > 20}
			<Typography el="p" classes="text-neutral-400"
				>Username must be less than 20 characters</Typography
			>
		{/if}
		<Input
			size="sm"
			id="bio"
			label="Bio"
			placeholder="Fun and interesting facts about yourself"
			type="textarea"
			bind:value={bio}
		/>

		{#if !socialReady}
			<LoadingIndicator>
				<Typography el="p" classes="text-neutral-400">Loading...</Typography>
			</LoadingIndicator>
		{:else}
			<Button
				type="submit"
				variant="green"
				size="sm"
				width="w-1/2"
				classes="mt-4 mx-auto"
				disabled={!canSubmit}
			>
				<div class="i-tabler-check" />
				Save profile
			</Button>
		{/if}
	</form>
{/if}

<style>
	.logo {
		@apply flex justify-center items-center;
	}
	.input--file__button {
		@apply absolute flex justify-start items-end cursor-pointer;
		@apply bg-transparent hover-bg-purple-900/70  w-full h-full rounded-full;
	}
	.input--file__text {
		@apply absolute justify-center items-center;
		@apply rounded-full text-xs font-bold text-purple-50;
		@apply w-full h-full;
		@apply hidden;
	}
	.input--file__button:hover .input--file__text {
		@apply flex;
	}
	.input--file__icon {
		@apply flex justify-center items-center;
		@apply bg-purple-50 text-purple-700 dark-bg-purple-700 dark-text-purple-50;
		@apply border-1px border-purple-700/20 dark-border-purple-50/30;
		@apply w-28px h-28px rounded-full;
		@apply text-base;
	}
</style>
