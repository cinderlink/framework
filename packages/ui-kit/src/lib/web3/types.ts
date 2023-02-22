import type { Connector } from '@wagmi/core';

export type ChainType = 'evm' | 'solana';

export type WalletDef = {
	id: string;
	name: string;
	description: string;
	icon?: string;
	image?: string;
	connector: (config?: any) => Promise<Connector>;
};

export type ChainDef = {
	id: string;
	name: string;
	icon?: string;
	image?: string;
	description: string;
	wallets: WalletDef[];
	key: WalletDef;
	create: (config?: any) => Promise<any>;
};
