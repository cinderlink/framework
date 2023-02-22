export function srcobject(node: HTMLVideoElement | HTMLAudioElement, stream: MediaStream) {
	node.srcObject = stream;
	return {
		destroy() {
			node.srcObject = null;
		}
	};
}
