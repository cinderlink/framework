<script lang="ts">
	import type { Web3Store } from '@candor/ui-kit/web3';
	import { theme } from '@candor/ui-kit/theme';
	import { CenteredPanelLayout } from '@candor/ui-kit/layout';
	import { Typography } from '@candor/ui-kit/content';
	import { Button, Input } from '@candor/ui-kit/interactive';
	import { LoadingIndicator } from '@candor/ui-kit/indicator';
	import { onboard } from '@candor/ui-kit/onboard';
	import { web3 } from '@candor/ui-kit/web3';
	import { ethers, type BigNumberish } from 'ethers';

	import EarlyAccessContract from '$lib/dapp/contracts/CandorEarlyAccess';

	let hasNFT = false;
	let nftContract: ethers.Contract | undefined = undefined;
	let current = 0;
	let max = 0;
	let balance: BigNumberish = 0;
	let paused: boolean = false;
	let minting = false;
	let error: string | undefined = undefined;
	let tokenId: number | undefined = undefined;
	let success = false;

	const wallets = onboard.state.select('wallets');

	$: if ($wallets?.[0]?.provider && !$web3.connected) {
		onWalletConnected();
	}

	async function onConnect() {
		await onboard.connectWallet();
	}

	async function onWalletConnected() {
		const address = $wallets[0].accounts[0].address;
		const provider = new ethers.providers.Web3Provider($wallets[0].provider);
		const signer = provider.getSigner();
		balance = await provider.getBalance(address);
		web3.update((state: Web3Store) => ({
			...state,
			connected: true,
			address,
			balance,
			provider,
			signer
		}));
		nftContract = new ethers.Contract(
			EarlyAccessContract.address,
			EarlyAccessContract.abi,
			$web3.signer
		);
		paused = await nftContract.paused();
		current = await nftContract.totalSupply();
		max = await nftContract.maxSupply();
		hasNFT = Number(ethers.utils.formatUnits(await nftContract.balanceOf(address))) !== 0;
		console.info('hasNFT', hasNFT);
	}

	async function mintNFT() {
		minting = true;
		if (!nftContract) {
			return;
		}
		const tx = await nftContract
			.mint($web3.address, {
				value: ethers.utils.parseEther('0.01')
			})
			.catch((err: Error) => {
				error = err.message;
				return undefined;
			});
		const receipt = await tx?.wait();
		tokenId = receipt?.events?.[0]?.args?.tokenId?.toNumber();
		success = !!tokenId;
		if (!tokenId && !error) {
			error = 'An unexpected error was encountered.';
		} else if (tokenId) {
			success = true;
		}
		minting = false;
	}
</script>

<CenteredPanelLayout>
	<Typography classes="text-purple-600 dark-(text-yellow-100)">Candor Early Access</Typography>
	{#if !$web3.connected}
		<Typography el="h4">Connect your wallet to access Candor Social</Typography>
		<Button
			variant={$theme.darkMode ? 'yellow' : 'dark'}
			size="xl"
			width="w-full"
			on:click={onConnect}
		>
			<div class="i-tabler-wallet" />
			Connect Wallet
		</Button>
	{:else if paused}
		<Typography el="h4">Minting is currently paused</Typography>
	{:else}
		<Typography el="h4">Mint your early access NFT</Typography>
		<Typography el="p" classes="flex flex-row items-center gap-2">
			Mint cost:
			<strong>0.01</strong>
			<div class="i-logos-ethereum" />
		</Typography>
		<Typography el="p">
			Current supply:
			<strong>{current}</strong> / <strong>{max}</strong>
		</Typography>
		<Typography el="p" classes="flex flex-row items-center gap-2">
			Current balance:
			<strong>{ethers.utils.formatUnits(balance)}</strong>
			<div class="i-logos-ethereum" />
		</Typography>

		{#if hasNFT}
			<div
				class="bg-blue-300 dark-bg-blue-900 px-8 py-4 text-xl rounded font-bold w-full flex flex-col gap-4"
			>
				You're good to go! Click the button below to proceed to the application
				<Button href="/feed" width="w-full" size="lg">Proceed to application</Button>
			</div>
		{:else if success}
			<Typography el="p" classes="text-green-500">
				<strong>Success!</strong> You have successfully minted token #{tokenId}!
			</Typography>
		{:else if error}
			<Typography el="p" classes="text-red-500">
				<strong>Error:</strong>
				{error}
			</Typography>
		{:else if minting}
			<LoadingIndicator>
				<div class="i-tabler-candy animate-spin" />
				Minting your access token...
			</LoadingIndicator>
		{:else}
			<Button width="w-full" size="lg" variant="green" on:click={mintNFT}>
				<div class="i-tabler-candy" />
				Mint Now
			</Button>
		{/if}
	{/if}
</CenteredPanelLayout>
