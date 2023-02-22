export function toggleable(node: HTMLElement, conf: ToggleConfig = DefaultToggleConfig) {
	const config = { ...DefaultToggleConfig, ...conf };
	if (config.open) {
		openable(node, config);
	}
	if (config.close) {
		closeable(node, config);
	}
	function onOpen() {
		node.dispatchEvent(new CustomEvent('toggle', { detail: { open: true } }));
	}
	function onClose() {
		node.dispatchEvent(new CustomEvent('toggle', { detail: { open: false } }));
	}
	node.addEventListener('open', onOpen);
	node.addEventListener('close', onClose);
	return {
		destroy() {
			node.removeEventListener('open', onOpen);
			node.removeEventListener('close', onClose);
		}
	};
}
