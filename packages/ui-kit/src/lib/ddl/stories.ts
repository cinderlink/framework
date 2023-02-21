import type { ComponentType, SvelteComponentTyped } from 'svelte';
export const stories = import.meta.glob('$lib/**/*.story.svelte', {
	eager: true
}) as Record<string, { default: ComponentType<SvelteComponentTyped>; story: StoryDef }>;

export function getStoryById(groupId: string, storyId: string) {
	return Object.values(stories).find(
		({ story }) => story?.group === groupId && story?.id === storyId
	);
}

export function getStoriesByGroupId(groupId: string) {
	return Object.values(stories).filter(({ story }) => story?.group === groupId);
}

export type StoryDef = {
	group: string;
	id: string;
	title: string;
	description: string;
};
