export function actionkeys(node: HTMLElement | Window, keys: Record<string, () => void>) {
	function handleKeypress(event: Event | KeyboardEvent) {
		if ((event as KeyboardEvent).key in keys) {
			keys[(event as KeyboardEvent).key]();
		}
	}

	node.addEventListener('keydown', handleKeypress as EventListener);

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeypress);
		}
	};
}

export type ToggleConfig = {
	isOpen?: boolean;
	open?: {
		onKeys?: string[];
		globalKeys?: string[];
		onClick?: boolean;
		onClickOutside?: boolean;
	};
	close?: {
		onKeys?: string[];
		globalKeys?: string[];
		onClick?: boolean;
		onClickOutside?: boolean;
	};
};
export const DefaultToggleConfig = {
	close: {
		onKeys: [],
		globalKeys: ['Escape'],
		onClick: false,
		onClickOutside: true
	},
	open: {
		onKeys: ['Enter', ' '],
		globalKeys: [],
		onClick: true,
		onClickOutside: false
	}
};
