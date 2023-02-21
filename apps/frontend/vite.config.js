import { sveltekit } from '@sveltejs/kit/vite';
import unocss from 'unocss/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		sveltekit(),
		unocss({
			autocomplete: true,
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
			'@wagmi/core',
			'@wagmi/core/chains',
			'@wagmi/core/providers/jsonRpc',
			'multiformats/bases/base64',
			'multiformats/bases/base58',
			'@multiformats/multiaddr',
			'@wagmi/core/connectors/mock',
			'ethers',
			'date-fns',
			'uuid',
			'buffer',
			'emittery',
			'@libp2p/peer-id',
			'@libp2p/crypto',
			'@libp2p/peer-id-factory',
			'dids',
			'key-did-resolver',
			'key-did-provider-ed25519'
		]
	}
};

export default config;
