import { writable } from 'svelte/store';

export const theme = writable({
	darkMode:
		(typeof window !== 'undefined' && window?.sessionStorage?.getItem('darkMode') === 'true') ||
		false
});

if (typeof window !== 'undefined') {
	theme.subscribe((value) => {
		window?.sessionStorage?.setItem('darkMode', value.darkMode.toString());
	});
}

export default theme;
