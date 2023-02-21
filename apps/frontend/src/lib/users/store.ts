import type { SocialUser } from '@candor/plugin-social-client';
import { writable } from 'svelte/store';

export const users = writable<Record<number, SocialUser>>([]);
