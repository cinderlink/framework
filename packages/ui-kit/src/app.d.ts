/// <reference types="@sveltejs/kit" />

import type { Keystore } from '$lib/web3/Onboard/Keystore';
import type { AttributifyAttributes } from '@unocss/preset-attributify';
declare namespace App {
	// interface Locals {}
	// interface PageData {}
	// interface Error {}
	// interface Platform {}
}

declare global {
	namespace svelte.JSX {
		interface HTMLAttributes<T> extends AttributifyAttributes {
			onclickoutside?: (event: CustomEvent) => void;
			onopen?: (event: CustomEvent) => void;
			href?: string | undefined;
		}
	}
	interface Window {
		__TAURI_METADATA__?: Record<string, unknown>;
		ethereum?: unknown;
		keystore?: Keystore;
	}
}
