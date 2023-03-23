<script lang="ts">
	import { Typography } from '@candor/ui-kit/content';
	import { ethers } from 'ethers';
	import { PUBLIC_RPC_URL, PUBLIC_CHAIN_ID, PUBLIC_CHAIN_NAME } from '$env/static/public';

	let encrypted: string | false = false;
	let encryptionKey: string | false = false;
	let wallet: ethers.Wallet | undefined = undefined;
	let loading: string | false = false;
	let error: string | false = false;

	async function unlockAccountKey() {
		if (!encrypted || !encryptionKey) {
			error = 'Account key not found or invalid.';
			return;
		}
		loading = 'Unlocking account key...';
		// encrypted contains a JSON encrypted ethers wallet
		wallet = await ethers.Wallet.fromEncryptedJson(encrypted, encryptionKey).catch(() => undefined);
		const provider = new ethers.providers.JsonRpcProvider(PUBLIC_RPC_URL, {
			chainId: Number(PUBLIC_CHAIN_ID),
			name: PUBLIC_CHAIN_NAME
		});
		wallet = wallet?.connect(provider);
		if (!wallet) {
			error = 'Failed to decrypt account key. Please check your encryption key.';
			loading = false;
			return;
		}
		sessionStorage.setItem('accountkey:mnemonic', wallet.mnemonic.phrase);
		loading = false;
	}
</script>

<Typography>Import Account Key</Typography>
