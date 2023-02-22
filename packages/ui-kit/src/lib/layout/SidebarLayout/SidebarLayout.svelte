<script>
	import Panel from '$lib/content/Panel/Panel.svelte';
	import Toggle from '$lib/interactive/Toggle/Toggle.svelte';
	import theme from '$lib/theme/store';
	import './SidebarLayout.css';
</script>

<Panel classes="layout__panel">
	<div class="layout layout--sidebar">
		<aside class="layout__sidebar">
			<slot name="sidebar" />
			<div class="align-self-end">
				<Toggle id="theme-toggle" bind:toggled={$theme.darkMode}>
					<div slot="off" class="px-4">
						<div class="i-tabler-sun text-yellow-200" />
					</div>
					<div slot="on" class="px-4">
						<div class="i-tabler-moon text-purple-50" />
					</div>
				</Toggle>
			</div>
		</aside>
		<div class="layout__page">
			<slot />
		</div>
	</div>
</Panel>
