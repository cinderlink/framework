<script lang="ts">
	import './CenteredPanelLayout.css';
	import Panel from '$lib/content/Panel/Panel.svelte';
</script>

<div class="layout layout--centered">
	<Panel>
		<slot />
	</Panel>
</div>
