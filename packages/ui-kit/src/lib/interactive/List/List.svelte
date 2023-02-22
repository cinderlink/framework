<script lang="ts">
	export let listDirection: 'vertical' | 'horizontal' = 'vertical';
</script>

<div class="list list--{listDirection}" {...$$restProps}>
	<div class="list__content">
		<slot />
	</div>
</div>

<style>
	.list {
		@apply list-style-none m-0 p-0;
	}

	.list.list--vertical .list__content {
		@apply flex flex-col gap-2;
	}

	.list.list--horizontal .list__content {
		@apply flex-row;
	}
</style>
