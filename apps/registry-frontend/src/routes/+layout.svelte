<script>
	import { Button } from '@candor/ui-kit';
	import { Input } from '@candor/ui-kit';
	import { Theme } from '@candor/ui-kit';
	import { Panel } from '@candor/ui-kit';
	import { WalletMenu } from '@candor/ui-kit';
</script>

<Theme>
	<header>
		<a href="/" class="brand">
			<div class="image-circle">
				<div class="i-tabler-link text-2xl text-white" />
			</div>
		</a>
		<div class="search">
			<Input id="search" width="w-full" placeholder="Search">
				<svelte:fragment slot="append">
					<Button color="black" radius="rounded-l-none" size="md">
						<div class="i-tabler-search" />
						Search
					</Button>
				</svelte:fragment>
			</Input>
			<div class="search__results">
				<Panel>Search results</Panel>
			</div>
		</div>
		<div class="profile">
			<WalletMenu />
		</div>
	</header>
	<slot />
</Theme>

<style>
	header {
		@apply flex gap-4 items-center justify-between px-4 py-2;
	}
	.brand {
		@apply w-1/4;
	}
	.image-circle {
		@apply w-12 h-12 rounded-full shadow-md;
		@apply bg-emerald-600;
		@apply flex items-center justify-center text-white;
	}
	.search {
		@apply w-1/2 flex gap-1 items-center relative;
	}
	.search__results {
		@apply absolute top-full left-0 w-full;
	}
	.profile {
		@apply w-1/4 flex justify-end;
	}
</style>
