import type { Wallet } from 'ethers';
export default {
	id: 'key',
	name: 'Account Key',
	description:
		'An account key is a private key that can be used to sign transactions and messages that is created and stored on your device.',
	icon: 'i-tabler-key',
	connector: async (wallet: Wallet) => {
		const { createConnector } = await import('./connector');
		return createConnector(wallet);
	}
};
