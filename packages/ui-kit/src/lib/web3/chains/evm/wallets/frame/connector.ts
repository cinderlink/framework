import { mainnet, optimism } from '@wagmi/core/chains';
import type { Chain } from '@wagmi/core';
import { InjectedConnector } from '@wagmi/core';

export function createConnector(chains: Chain[] = [mainnet, optimism]) {
	return new InjectedConnector({
		chains,
		options: {
			name: 'Frame'
		}
	});
}
