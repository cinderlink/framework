import {
	defineConfig,
	presetAttributify,
	presetIcons,
	presetTypography,
	presetUno,
	presetWebFonts,
	transformerDirectives,
	transformerVariantGroup
} from 'unocss';

export default defineConfig({
	presets: [
		presetAttributify(),
		presetIcons(),
		presetTypography(),
		presetWebFonts({
			provider: 'google',
			fonts: {
				sans: 'DM Sans:100,400,700',
				mono: 'Chivo Mono:400,700'
			}
		}),
		presetUno()
	],
	transformers: [transformerDirectives(), transformerVariantGroup()],
	theme: {
		colors: {
			blue: {
				'50': '#e6f6ff',
				'100': '#d1edff',
				'200': '#addbff',
				'300': '#7cc1ff',
				'400': '#4996ff',
				'500': '#206bff',
				'600': '#0042ff',
				'700': '#0046ff',
				'800': '#003bd9',
				'900': '#041d60'
			},
			green: {
				'50': '#eefff6',
				'100': '#d6ffec',
				'200': '#b0ffda',
				'300': '#73ffbe',
				'400': '#2ff99a',
				'500': '#05f283',
				'600': '#00bc62',
				'700': '#029350',
				'800': '#087342',
				'900': '#095e39'
			},
			purple: {
				'50': '#f4f3ff',
				'100': '#ece9fe',
				'200': '#dbd5ff',
				'300': '#bfb4fe',
				'400': '#9e86fc',
				'500': '#8259f9',
				'600': '#7237f0',
				'700': '#6325dc',
				'800': '#521eb9',
				'900': '#461b97'
			},
			red: {
				'50': '#fff1f1',
				'100': '#ffe1e2',
				'200': '#ffc7c9',
				'300': '#ffa0a3',
				'400': '#ff7f83',
				'500': '#f83b41',
				'600': '#e51d23',
				'700': '#c11419',
				'800': '#a01418',
				'900': '#84181b'
			},
			cyan: {
				'50': '#ebffff',
				'100': '#cdfcff',
				'200': '#a1f6ff',
				'300': '#80f0ff',
				'400': '#1ad9f6',
				'500': '#00bcdc',
				'600': '#0195b9',
				'700': '#097795',
				'800': '#116079',
				'900': '#134f66'
			},
			aqua: {
				'50': '#e9fff8',
				'100': '#cbffeb',
				'200': '#80ffd4',
				'300': '#5bface',
				'400': '#1becb9',
				'500': '#00d4a4',
				'600': '#00ad87',
				'700': '#008a70',
				'800': '#006d59',
				'900': '#00594b'
			}
		}
	}
});
