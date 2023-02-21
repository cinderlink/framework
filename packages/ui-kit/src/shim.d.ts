declare namespace svelteHTML {
	import type { AttributifyAttributes } from '@unocss/preset-attributify';

	type HTMLAttributes = AttributifyAttributes;
}

declare module '*.svelte' {
	import type { ComponentType } from 'svelte';
	const component: ComponentType;
	export default component;
}
