<script lang="ts">

	async function createAccountKey() {
		wallet = ethers.Wallet.createRandom({ rpcUrl: window.keystore.rpcUrl });
	}

	
	async function encryptAccountKey() {
		if (!wallet) {
			error = 'Account key not found.';
			return;
		}

		loading = 'Encrypting account key...';
		encrypted = await wallet.encrypt(
			encryptionKey,
			{
				scrypt: {
					N: 2 ** 4
				}
			},
			(p) => {
				progress = p;
			}
		);

		if (!encrypted) {
			error = 'Failed to encrypt account key.';
			return;
		}

		localStorage.setItem('candor:key', encrypted);
		await connectToWallet(wallet);
		loading = false;
	}

    </script>