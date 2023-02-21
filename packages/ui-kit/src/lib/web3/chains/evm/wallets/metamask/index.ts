export default {
	id: 'metamask',
	name: 'Metamask',
	description:
		'Metamask is a browser extension that allows you to interact with Ethereum dapps and wallets.',
	icon: 'i-logos-metamask-icon',
	connector: async () => {
		const { createConnector } = await import('./connector');
		return createConnector();
	}
};
