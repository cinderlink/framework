<script lang="ts">
	import Button from '$lib/interactive/Button/Button.svelte';
</script>

<aside class="sidebar">
	<div class="sidebar__content">
		<slot />
	</div>
	<div class="sidebar__toggle">
		<Button>
			<div class="i-tabler-menu" />
		</Button>
	</div>
</aside>
