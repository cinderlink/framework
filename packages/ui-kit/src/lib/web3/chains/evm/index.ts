import type { ChainDef } from '$lib/web3/types';
import type { Chain, Client, Connector } from '@wagmi/core';
import frame from './wallets/frame';
import metamask from './wallets/metamask';
import key from './key';

const evm: ChainDef = {
	id: 'evm',
	name: 'Ethereum',
	icon: 'i-logos-ethereum',
	description: 'Connect with Frame, Rainbow, Metamask, and more.',
	wallets: [frame, metamask],
	key,
	create
};
export default evm;

export async function create(config: { connectors: Connector[] }): Promise<Client<any, any>> {
	const { mainnet, optimism, arbitrum, polygon, foundry } = await import('@wagmi/core/chains');
	const { jsonRpcProvider } = await import('@wagmi/core/providers/jsonRpc');
	const { createClient, configureChains } = await import('@wagmi/core');
	const { provider, webSocketProvider } = configureChains(
		[mainnet, optimism, arbitrum, polygon, foundry],
		[
			jsonRpcProvider({
				rpc: (chain: Chain) => {
					const conf = {
						http: chain.rpcUrls.default.http[0],
						webSocket: chain.rpcUrls.default.webSocket?.[0]
					};
					console.info('Chain config:', chain, conf);
					return conf;
				}
			})
		]
	);

	return createClient({
		connectors: config.connectors,
		provider,
		webSocketProvider
	});
}
