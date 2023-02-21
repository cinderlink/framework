import { sveltekit } from '@sveltejs/kit/vite';
import unocss from 'unocss/vite';
import {
	presetAttributify,
	presetIcons,
	presetTypography,
	presetUno,
	presetWebFonts,
	transformerCompileClass,
	transformerDirectives
} from 'unocss';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		unocss({
			presets: [presetUno(), presetAttributify(), presetIcons(), presetTypography()],
			transformers: [transformerDirectives(), transformerCompileClass()]
		}),
		sveltekit()
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
};

export default config;
