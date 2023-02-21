<script lang="ts">
	// import 'uno.css';
	// import '@unocss/reset/tailwind.css';
	import { Theme } from '@candor/ui-kit';
	import { Typography } from '@candor/ui-kit';
	import { SidebarLayout } from '@candor/ui-kit';
	import { Input } from '@candor/ui-kit';
</script>

<Theme>
	<div class="bg-blue-900 w-full flex items-center justify-between px-4 py-2">
		<div class="w-1/8">
			<h1 class="text-blue-400 text-xl">registry.candor.social</h1>
		</div>
		<div class="search flex-1">
			<Input id="search" width="w-full" placeholder="Search" />
		</div>
		<div class="connect w-1/8">connect</div>
	</div>
	<SidebarLayout>
		<svelte:fragment slot="sidebar">
			<nav class="text-right flex items-end mt-4">
				<Typography el="h5">Links</Typography>
				<a href="/">
					Home
					<div class="i-tabler-home" />
				</a>
				<a href="/about">
					About
					<div class="i-tabler-info-circle" />
				</a>
				<a href="/taxonomy">
					Taxonomy
					<div class="i-tabler-category" />
				</a>
				<a href="/registry">
					Registry
					<div class="i-tabler-vocabulary" />
				</a>
				<a href="/discover">
					Discover
					<div class="i-tabler-compass" />
				</a>
				<a href="/search">
					Search
					<div class="i-tabler-search" />
				</a>
			</nav>
		</svelte:fragment>
		<div class="w-full h-full overflow-auto">
			<slot />
		</div>
	</SidebarLayout>
</Theme>

<style>
	nav {
		@apply flex flex-col gap-2;
	}
	a {
		@apply flex items-center gap-2;
	}
</style>
