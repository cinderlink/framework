import { sveltekit } from '@sveltejs/kit/vite';
import unocss from 'unocss/vite';
import nodePolyfills from 'rollup-plugin-polyfill-node';

const MODE = process.env.NODE_ENV;
const development = MODE === 'development';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		unocss({
			autocomplete: true,
			configFile: 'unocss.config.ts'
		}),
		sveltekit(),
		development &&
			nodePolyfills({
				include: ['node_modules/**/*.js', new RegExp('node_modules/.vite/.*js')],
				http: true,
				crypto: true
			})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	resolve: {
		alias: {
			crypto: 'crypto-browserify',
			stream: 'stream-browserify',
			assert: 'assert'
		}
	},
	build: {
		rollupOptions: {
			external: ['@web3-onboard/*'],
			plugins: [nodePolyfills({ crypto: true, http: true })]
		},
		commonjsOptions: {
			transformMixedEsModules: true
		}
	},
	optimizeDeps: {
		exclude: ['@ethersproject/hash', 'wrtc', 'http'],
		include: [
			'@web3-onboard/core',
			'@web3-onboard/gas',
			'@web3-onboard/sequence',
			'js-sha3',
			'@ethersproject/bignumber'
		]
	}
};

export default config;
