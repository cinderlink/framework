import type { CryptidsClient } from '@cryptids/client';
import type { SocialClientEvents } from '@cryptids/plugin-social-client';
import { writable, type Writable } from 'svelte/store';

export type CryptidsStore = {
	client: CryptidsClient<[SocialClientEvents]> | undefined;
	connected: boolean;
};

export const cryptids: Writable<CryptidsStore> = writable({
	client: undefined,
	connected: false
});
export default cryptids;
