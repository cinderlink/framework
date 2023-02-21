<script>
	import '@unocss/reset/tailwind.css';
	import 'uno.css';
	import './Theme.css';
	import { theme } from './store';

	// load dark mode from system setting
	$theme.darkMode =
		typeof window === 'undefined'
			? false
			: window.matchMedia('(prefers-color-scheme: dark)').matches;

	$: if (typeof document !== 'undefined') document.body.classList.toggle('dark', $theme.darkMode);
</script>

<div id="theme">
	<slot />
</div>
