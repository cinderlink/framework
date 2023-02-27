<script lang="ts">
	export let progress = 0;
</script>

<div class="progress__bar">
	<div class="progress__fill" style="width: {progress}%" />
	<div class="progress__content">
		<slot />
	</div>
</div>

<style>
	.progress__bar {
		@apply relative w-full h-8 bg-purple-800 rounded;
	}

	.progress__fill {
		@apply absolute top-0 left-0 h-full bg-purple-300 rounded animate-pulse;
	}

	.progress__content {
		@apply absolute top-0 left-0 w-full h-full flex items-center justify-center;
	}
</style>
