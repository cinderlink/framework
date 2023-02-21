<script lang="ts" context="module">
	import type { GroupDef } from '$lib/ddl/groups';
	import Typography from '../content/Typography/Typography.svelte';
	export const group: GroupDef = {
		id: 'web3',
		label: 'Web3',
		description: 'Components for interacting with the blockchain'
	};
</script>

<Typography>{group.label}</Typography>
<Typography el="p">{group.description}</Typography>
