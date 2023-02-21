import FrameLogo from './FrameLogo.svg';
export default {
	id: 'frame',
	name: 'Frame',
	description:
		'Frame is a browser extension that allows you to interact with Ethereum dapps and wallets.',
	image: FrameLogo,
	connector: async () => {
		const { createConnector } = await import('./connector');
		return createConnector();
	}
};
