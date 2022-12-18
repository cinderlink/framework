<script lang="ts">
	export let href: string;
	export let icon: string;
</script>

<li>
	<a {href}>
		{#if icon}
			<div class={icon} />
		{/if}
		<slot />
	</a>
</li>

<style>
	li a {
		@apply flex items-center text-xl text-blue-900 gap-2 text-lg;
		@apply my-2 px-2 py-1 border-2 border-blue-50 border-b-blue-100 rounded shadow;
		@apply transition-colors duration-200;
	}
	li a:hover {
		@apply bg-blue-50/50 border-blue-200 shadow-lg;
	}
	li a div {
		@apply text-2xl text-blue-800 transition-colors duration-200;
	}
	li a:hover div {
		@apply text-teal-500;
	}
</style>
