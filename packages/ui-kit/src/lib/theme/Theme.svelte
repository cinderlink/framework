<script lang="ts">
	import 'uno.css';
	import '@unocss/reset/tailwind.css';
	import './Theme.css';
	import theme from './store';

	$: if ($theme.darkMode) {
		document.body.classList.add('dark');
	} else {
		document.body.classList.remove('dark');
	}
</script>

<div id="theme">
	<slot />
</div>
