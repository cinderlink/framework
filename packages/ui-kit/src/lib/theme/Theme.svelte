<script lang="ts">
	import 'uno.css';
	import '@unocss/reset/tailwind.css';
	import './Theme.css';
	import theme from './store';

	$: if ($theme.darkMode && typeof document !== 'undefined') {
		document?.body.classList.add('dark');
	} else if (typeof document !== 'undefined') {
		document?.body.classList.remove('dark');
	}
</script>

<div id="theme">
	<slot />
</div>
