export function clickoutside(node?: Node) {
	function handleClickOutside(event: MouseEvent | TouchEvent) {
		if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
			node.dispatchEvent(new CustomEvent('clickoutside'));
		}
	}

	document.addEventListener('click', handleClickOutside, true);
	document.addEventListener('contextmenu', handleClickOutside, true);
	document.addEventListener('touchstart', handleClickOutside, true);

	return {
		destroy() {
			document.removeEventListener('click', handleClickOutside, true);
			document.removeEventListener('contextmenu', handleClickOutside, true);
			document.removeEventListener('touchstart', handleClickOutside, true);
		}
	};
}
