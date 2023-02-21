<script>
	import Theme from '$lib/theme/Theme.svelte';
	import SidebarLayout from '$lib/layout/SidebarLayout/SidebarLayout.svelte';
	import Logo from '$lib/Logo.svelte';
	import Toggle from '$lib/interactive/Toggle/Toggle.svelte';
	import theme from '$lib/theme/store';
	import Dropdown from '$lib/interactive/Dropdown/Dropdown.svelte';
	import Drawer from '$lib/content/Drawer/Drawer.svelte';
	import Panel from '$lib/content/Panel/Panel.svelte';
</script>

<Theme>
	<SidebarLayout>
		<div slot="sidebar" class="flex-1 flex flex-col gap-4 items-start justify-start">
			<div class="flex w-full justify-center items-center">
				<Logo />
			</div>
			<a id="brand" href="/">@candor/ui-kit</a>
			<nav class="flex-1 flex flex-col gap-2">
				<Drawer label="Guides">
					<ul>
						<li>
							<a href="/guides/getting-started">Getting Started</a>
						</li>
						<li>
							<a href="/guides/web3">Web3 Guides</a>
						</li>
					</ul>
				</Drawer>

				<Drawer label="Customization">
					<ul>
						<li>
							<a href="/themes/default">Default Theme</a>
						</li>
						<li>
							<a href="/themes/custom">Customization</a>
						</li>
						<li>
							<a href="/themes/community">Community Themes</a>
						</li>
					</ul>
				</Drawer>

				<Drawer label="Components">
					<ul>
						<li>
							<a href="/components/content">Content</a>
						</li>
						<li>
							<a href="/components/indicator">Indicator</a>
						</li>
						<li>
							<a href="/components/interactive">Interactive</a>
						</li>
						<li>
							<a href="/components/layout">Layout</a>
						</li>
						<li>
							<a href="/components/navigation">Navigation</a>
						</li>
						<li>
							<a href="/components/web3">Web3</a>
						</li>
					</ul>
				</Drawer>
			</nav>
		</div>
		<main>
			<slot />
		</main>
	</SidebarLayout>
</Theme>

<style>
	ul {
		@apply pl-2 py-2 flex flex-col gap-2;
	}
	ul > li {
		@apply px-4 py-2 rounded-md hover-(bg-purple-100) dark-(hover-bg-purple-900);
	}
	ul > li > a {
		@apply text-md text-purple-800 dark-(text-yellow-100);
	}
	main {
		@apply px-8 py-2 bg-purple-50/5;
	}
</style>
