<script>
	import { Typography } from '@candor/ui-kit';
	import { Button } from '@candor/ui-kit';
	import { Breadcrumb } from '@candor/ui-kit';
</script>

<div class="flex flex-col gap-2 px-4 py-2">
	<Breadcrumb sections={[{ label: 'Taxonomy', path: '/taxonomy' }]} />
	<Typography>Taxonomy</Typography>
	<p>Categories and Topics used to classify <a href="/registry">Registry</a> entries.</p>

	<Button href="/taxonomy/create">Create Category or Topic</Button>
</div>
