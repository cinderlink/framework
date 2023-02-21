<script lang="ts" context="module">
	import type { GroupDef } from '$lib/ddl/groups';
	import Typography from '../content/Typography/Typography.svelte';
	export const group: GroupDef = {
		id: 'interactive',
		label: 'Interactive',
		description: 'Interactive components (forms, buttons, etc...)'
	};
</script>

<Typography>{group.label}</Typography>
<Typography el="p">{group.description}</Typography>
