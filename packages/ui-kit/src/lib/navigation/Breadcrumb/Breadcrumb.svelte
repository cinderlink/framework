<script lang="ts">
	import { page } from '$app/stores';
	export let sections: { label: string; path: string }[] = [];
</script>

<div class="breadcrumb">
	<a href="/">
		<div class="i-tabler-home text-purple-600 dark-(text-purple-200)" />
	</a>
	<slot>
		{#each sections as section}
			{@const active = $page.url.pathname === section.path}
			<div class="breadcrumb__separator">/</div>
			<a href={section.path} class="breadcrumb__link" class:breadcrumb__link--active={active}
				>{section.label}</a
			>
		{/each}
	</slot>
</div>

<style>
	.breadcrumb {
		@apply flex flex-row items-center gap-1 text-sm mb-2 px-2 py-1 rounded border-b-2;
		@apply bg-purple-50 border-neutral-300 transition-colors duration-200 ease-in-out;
		@apply dark-(bg-purple-900 text-purple-50 border-purple-800);
	}
	.breadcrumb__separator {
		@apply text-purple-800 dark-(text-purple-200);
	}
	.breadcrumb__link {
		@apply text-purple-400 dark-(text-purple-200) font-mono;
	}
	.breadcrumb__link--active {
		@apply text-purple-600 dark-(text-purple-50) font-bold;
	}
</style>
