<script lang="ts">
	import { Typography } from '@candor/ui-kit';
	import { Button } from '@candor/ui-kit';
	import { Card } from '@candor/ui-kit';
</script>

<div class="px-4 py-2">
	<Typography>On-Chain Taxonomy & Metadata Registry</Typography>

	<div class="flex flex-col gap-2 mt-6">
		<Card el="a" color="neutral" href="/taxonomy">
			<Typography el="h2" classes="mb-4">Taxonomy</Typography>
			<p>
				Classify all named things and describe their relationships using simple contracts and IPFS
				CIDs.
			</p>
			<div class="flex justify-end mt-4">
				<Button variant="outlined">Learn More</Button>
			</div>
		</Card>

		<Card color="neutral" href="/registry">
			<Typography el="h2" classes="mb-4">Metadata Registry</Typography>
			<p>
				Store and retrieve metadata for all named things. Like ENS meets Wikipedia. A key building
				block of the real metaverse.
			</p>
			<div class="flex justify-end mt-4">
				<Button variant="outlined">Learn More</Button>
			</div>
		</Card>
	</div>
</div>
