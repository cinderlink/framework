<script>
	import Typography from '$lib/components/content/Typography.svelte';
</script>

<div class="flex gap-4">
	<section class="w-1/2">
		<Typography type="title" classes="text-blue-800">appname</Typography>
		<Typography type="prose">
			Prose is a class that adds default styles to common HTML elements. It's a great starting point
			for writing content in your app or website.
		</Typography>
	</section>
	<section class="w-1/2">
		<div
			class="bg-gradient-to-br from-blue-800 via-blue-900 to-blue-800 rounded-md b-2 b-blue-200 w-full h-full text-white flex items-center justify-center p-4 shadow"
		>
			hello, world
		</div>
	</section>
</div>
