export function openable(node: HTMLElement, config: ToggleConfig = DefaultToggleConfig) {
	if (!config.open) return;
	const open = () => {
		node.dispatchEvent(new CustomEvent('open'));
	};

	let _keydown: ReturnType<typeof actionkeys> | undefined;
	if (config.open.onKeys) {
		_keydown = actionkeys(
			node,
			config.open.onKeys.reduce(
				(acc, key) => ({ ...acc, [key]: open }),
				{} as Record<string, () => void>
			)
		);
	}

	let _globalKeydown: ReturnType<typeof actionkeys> | undefined;
	if (config.open.globalKeys) {
		_globalKeydown = actionkeys(
			window,
			config.open.globalKeys.reduce(
				(acc, key) => ({ ...acc, [key]: open }),
				{} as Record<string, () => void>
			)
		);
	}

	if (config.open.onClick) node.addEventListener('click', open);
	return {
		destroy() {
			_keydown?.destroy();
			_globalKeydown?.destroy();
			if (config.open?.onClickOutside) node.removeEventListener('click', open);
		}
	};
}
