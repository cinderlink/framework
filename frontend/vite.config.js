import { sveltekit } from '@sveltejs/kit/vite';
import {
	presetAttributify,
	presetIcons,
	presetUno,
	presetWebFonts,
	transformerDirectives
} from 'unocss';
import unocss from 'unocss/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [unocss('unocss.config.ts'), sveltekit()],
	define: {
		'process.env': {},
		global: 'globalThis'
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
};

export default config;
