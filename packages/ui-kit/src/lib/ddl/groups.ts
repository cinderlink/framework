import type { ComponentType, SvelteComponentTyped } from 'svelte';
export const groups = import.meta.glob('$lib/**/*.group.svelte', {
	eager: true
}) as Record<string, { default: ComponentType<SvelteComponentTyped>; group: GroupDef }>;
export default groups;

export function getGroupById(id: string) {
	return Object.values(groups).find(({ group }) => group.id === id);
}

export type GroupDef = {
	id: string;
	label: string;
	description: string;
};
