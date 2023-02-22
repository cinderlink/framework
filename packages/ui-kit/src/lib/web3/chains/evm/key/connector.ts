import type { Wallet } from 'ethers';
import type { Chain } from '@wagmi/core';
import { mainnet, optimism } from '@wagmi/core/chains';
import { MockConnector } from '@wagmi/core/connectors/mock';

export function createConnector(wallet: Wallet, chains: Chain[] = [mainnet, optimism]) {
	console.info('creating mock connector for wallet', wallet);
	return new MockConnector({
		chains,
		options: {
			name: 'Candor Account Key',
			signer: wallet,
			flags: {
				isAuthorized: true
			}
		}
	});
}
