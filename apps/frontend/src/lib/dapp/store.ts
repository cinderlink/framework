import type { CandorClientInterface } from '@candor/core-types';
import type { OfflineSyncClientEvents } from '@candor/plugin-offline-sync-core';
import type { SocialClientEvents } from '@candor/plugin-social-client';
import { writable, type Writable } from 'svelte/store';

export type dAppStore = {
	client: CandorClientInterface<SocialClientEvents & OfflineSyncClientEvents> | undefined;
	connected: boolean;
};

export const dapp: Writable<dAppStore> = writable({
	client: undefined,
	connected: false
});
export default dapp;
