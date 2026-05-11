import PortClient from '../clients/PortClient';

const portApiUrl: Record<string, string> = {
	eu: 'https://api.port.io',
	us: 'https://api.us.port.io',
};

export const getPortApiClient = (region: string, clientId: string, clientSecret: string) => {
	return new PortClient({
		url: portApiUrl[region],
		auth: {
			clientId,
			clientSecret,
		},
	});
};

export const getAllBlueprints = (portClient: PortClient) => {
	return portClient.blueprints().get();
};

export const getOrg = (portClient: PortClient) => {
	return portClient.organization().get();
};
