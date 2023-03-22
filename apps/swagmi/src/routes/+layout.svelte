<script lang="ts">
	import { Theme } from '@candor/ui-kit/theme';
	import { SidebarLayout } from '@candor/ui-kit/layout';
	import './layout.css';
</script>

<Theme>
	<SidebarLayout>
		<aside slot="sidebar">
			<a href="/" id="brand">swagmi</a>

			<nav>
				<a href="/stores">stores</a>
				<a href="/components">components</a>
				<a href="/components/connect">connect</a>
			</nav>
		</aside>

		<main id="viem-app">
			<slot />
		</main>
	</SidebarLayout>
</Theme>

<style>
	#viem-app {
		@apply p-4;
	}
</style>
