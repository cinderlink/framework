import { mainnet, optimism } from '@wagmi/core/chains';
import type { Chain } from '@wagmi/core';
import { MetaMaskConnector } from '@wagmi/core/connectors/metaMask';

export function createConnector(chains: Chain[] = [mainnet, optimism]) {
	return new MetaMaskConnector({
		chains
	});
}
