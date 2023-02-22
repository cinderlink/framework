export function closeable(node: HTMLElement, config: ToggleConfig = DefaultToggleConfig) {
	if (!config.close) return;
	const close = () => {
		node.dispatchEvent(new CustomEvent('close'));
	};

	let _keydown: ReturnType<typeof actionkeys> | undefined;
	if (config.close.onKeys) {
		_keydown = actionkeys(
			node,
			config.close.onKeys.reduce((acc, key) => ({ ...acc, [key]: close }), {})
		);
	}

	let _globalKeydown: ReturnType<typeof actionkeys> | undefined;
	if (config.close.globalKeys) {
		_globalKeydown = actionkeys(
			window,
			config.close.globalKeys.reduce((acc, key) => ({ ...acc, [key]: close }), {})
		);
	}

	let _clickoutside: ReturnType<typeof clickoutside> | undefined;
	if (config.close.onClickOutside) {
		_clickoutside = clickoutside(node);
		node.addEventListener('clickoutside', close);
	}
	if (config.close.onClick) node.addEventListener('click', close);

	return {
		destroy() {
			_keydown?.destroy();
			_globalKeydown?.destroy();
			_clickoutside?.destroy();
			if (config.close?.onClick) node.removeEventListener('click', close);
			if (config.close?.onClickOutside) node.removeEventListener('clickoutside', close);
		}
	};
}
