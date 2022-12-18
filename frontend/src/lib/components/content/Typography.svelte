<script lang="ts">
	export let type: 'title' | 'body' | 'prose' | 'subtitle' | 'caption' = 'body';
	export let el = type === 'title' ? 'h1' : type === 'subtitle' ? 'h2' : 'p';
	export let classes = '';
</script>

<svelte:element this={el} class="typography typography--{type} {classes}">
	<slot />
</svelte:element>

<style>
	.typography--title {
		@apply text-4xl font-bold mb-4;
	}
	.typography--subtitle {
		@apply text-2xl font-bold;
	}
	.typography--body {
		@apply text-lg;
	}
	.typography--prose {
		@apply text-lg;
	}
	.typography--caption {
		@apply text-sm;
	}
</style>
