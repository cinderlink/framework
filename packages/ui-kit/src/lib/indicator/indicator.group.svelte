<script lang="ts" context="module">
	import type { GroupDef } from '$lib/ddl/groups';
	import Typography from '../content/Typography/Typography.svelte';
	export const group: GroupDef = {
		id: 'indicator',
		label: 'Indicator',
		description: 'Indicator components (loading, status, etc...)'
	};
</script>

<Typography>{group.label}</Typography>
<Typography el="p">{group.description}</Typography>
