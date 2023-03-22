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
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	build: {
		minify: false,
		target: 'esnext'
	},
	optimizeDeps: {
		force: true,
		esbuildOptions: {
			target: 'esnext'
		}
	}
};

export default config;
