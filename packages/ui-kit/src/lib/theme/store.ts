import { writable } from 'svelte/store';

export const theme = writable({
	darkMode: false
});

export default theme;
