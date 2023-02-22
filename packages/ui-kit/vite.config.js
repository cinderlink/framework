import { sveltekit } from '@sveltejs/kit/vite';
import unocss from 'unocss/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		unocss({
			autocomplete: true,
			configFile: 'unocss.config.ts'
		}),
		sveltekit()
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
};

export default config;
