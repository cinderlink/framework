import type { UserConfig } from 'vite';
import unocss from 'unocss/vite';
import { sveltekit } from '@sveltejs/kit/vite';

const config: UserConfig = {
	plugins: [
		sveltekit(),
		unocss({
			configFile: 'unocss.config.ts'
		})
	],
	define: {
		global: 'globalThis'
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	build: {
		minify: false,
		target: 'esnext'
	},
	optimizeDeps: {
		include: [
			'ethers',
			'@web3-onboard/coinbase',
			'@web3-onboard/core',
			'@web3-onboard/gnosis',
			'@web3-onboard/injected-wallets',
			'@web3-onboard/ledger',
			'@web3-onboard/walletconnect'
		]
	}
};

export default config;
