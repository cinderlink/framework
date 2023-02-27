<script lang="ts">
	export let flex = 'flex flex-col gap-2';
</script>

<div class="list {flex}" {...$$restProps}>
	<slot />
</div>

<style>
	.list {
		@apply list-style-none m-0 p-0;
	}
</style>
