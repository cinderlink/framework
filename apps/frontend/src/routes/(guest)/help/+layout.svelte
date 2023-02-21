<script lang="ts">
	import { Typography } from '@candor/ui-kit';
	import { Button } from '@candor/ui-kit';
	import { SidebarLayout } from '@candor/ui-kit';
</script>

<SidebarLayout>
	<aside slot="sidebar">
		<Typography el="h3">Help Topics</Typography>
		<Button href="/help/connect">Connecting to Candor</Button>

		<Typography el="h3">Links</Typography>
		<Button href="/">Home</Button>
		<Button href="/connect">Connect</Button>
	</aside>
	<main>
		<slot />
	</main>
</SidebarLayout>
