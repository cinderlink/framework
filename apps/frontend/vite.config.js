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
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	build: {
		minify: false,
		target: 'esnext'
	}
};

export default config;
