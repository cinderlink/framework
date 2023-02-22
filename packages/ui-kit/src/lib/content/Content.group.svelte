<script lang="ts" context="module">
	import type { GroupDef } from '$lib/ddl/groups';
	import Typography from './Typography/Typography.svelte';
	export const group: GroupDef = {
		id: 'content',
		label: 'Content',
		description: 'Page content and data components'
	};
</script>

<Typography>{group.label}</Typography>
<Typography el="p">{group.description}</Typography>
