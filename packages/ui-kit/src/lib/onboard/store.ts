import { PUBLIC_LOCAL_CHAIN } from '$env/static/public';
import { setProvider } from '$lib/web3';
import Onboard from '@web3-onboard/core';
import coinbaseWallet from '@web3-onboard/coinbase';
import injectedWallet from '@web3-onboard/injected-wallets';
import walletConnect from '@web3-onboard/walletconnect';
import ledger from '@web3-onboard/ledger';
import gnosis from '@web3-onboard/gnosis';
import { ethers } from 'ethers';

const chains = PUBLIC_LOCAL_CHAIN
	? [
			{
				id: 31337,
				token: 'ETH',
				label: 'Anvil',
				rpcUrl: 'http://localhost:8545'
			}
	  ]
	: [
			{
				id: 10,
				token: 'ETH',
				label: 'Optimism Mainnet',
				rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/Zam-sGhxgxWPNep21l0vQK97XmupDU_-'
			},
			{
				id: 420,
				token: 'ETH',
				label: 'Optimism Goerli',
				rpcUrl: 'https://opt-goerli.g.alchemy.com/v2/KtWpuOdxrbC-ZixR2pf9LZyBfA7nGW9V'
			}
	  ];

export const onboard = Onboard({
	wallets: [
		coinbaseWallet({ darkMode: true }),
		injectedWallet(),
		walletConnect(),
		gnosis(),
		ledger()
	],
	chains,
	connect: {
		autoConnectLastWallet: true
	}
});
export default onboard;

const wallets = onboard.state.select('wallets');
wallets.subscribe(($wallets) => {
	if ($wallets[0]) {
		const web3Provider = new ethers.providers.Web3Provider($wallets[0].provider);
		setProvider($wallets[0].accounts[0].address, web3Provider);
	}
});
