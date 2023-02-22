<script lang="ts" context="module">
	import type { GroupDef } from '$lib/ddl/groups';
	import Typography from '../content/Typography/Typography.svelte';
	export const group: GroupDef = {
		id: 'navigation',
		label: 'Navigation',
		description: 'Navigation components'
	};
</script>

<Typography>{group.label}</Typography>
<Typography el="p">{group.description}</Typography>
