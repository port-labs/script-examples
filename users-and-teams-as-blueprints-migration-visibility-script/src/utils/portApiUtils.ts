import PortClient from '../clients/PortClient';
import { ActionPermissionsWithAction, BlueprintPermissionsWithBlueprint, Env, PagePermissionsWithPage } from '../types';

const portApiUrl: Record<string, string> = {
	eu: 'http://localhost:3000',
	us: '',
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

export const getAllBlueprintPermissions = async (portClient: PortClient, blueprints: any[]) => {
	const blueprintPermissions: BlueprintPermissionsWithBlueprint[] = [];
	for (const blueprint of blueprints) {
		const permissions = await portClient.blueprint(blueprint.identifier).permissions().get();
		blueprintPermissions.push({ blueprint, permissions });
	}
	return blueprintPermissions;
};

export const countEntitiesWithTeamValues = async (portClient: PortClient, blueprintIdentifier: string) => {
	const entities = await portClient.entities().search(
		{
			combinator: 'and',
			rules: [
				{ operator: 'isNotEmpty', property: '$team' },
				{ operator: '=', property: '$blueprint', value: blueprintIdentifier },
			],
		},
		{
			include: ['identifier'],
			exclude_calculated_properties: true,
			attach_title_to_relation: false,
		},
	);
	return entities.length;
};

export const getAllActions = (portClient: PortClient) => {
	return portClient.actions().get('v2');
};

export const getAllActionsPermissions = async (
	portClient: PortClient,
	actions: any[],
): Promise<ActionPermissionsWithAction[]> => {
	const actionPermissions: ActionPermissionsWithAction[] = [];
	const selfServiceActions = actions.filter((action) => action.trigger.type === 'self-service');
	for (const action of selfServiceActions) {
		const permissions = await getActionPermissions(portClient, action.identifier);
		actionPermissions.push({ action, permissions, reviewReason: null });
	}
	return actionPermissions;
};

const getActionPermissions = (portClient: PortClient, actionIdentifier: string) => {
	return portClient.action(actionIdentifier).permissions().get();
};

export const getAllIntegrations = (portClient: PortClient) => {
	return portClient.integrations().getAll();
};

export const getAllWebhooks = (portClient: PortClient) => {
	return portClient.webhooks().get();
};

export const getAllPages = (portClient: PortClient) => {
	return portClient.pages().get();
};

const getPagePermissions = (portClient: PortClient, pageIdentifier: string) => {
	return portClient.page(pageIdentifier).permissions().get();
};

export const getAllPagesPermissions = async (portClient: PortClient, pages: any[]) => {
	const pagePermissions: PagePermissionsWithPage[] = [];
	const filteredPages = pages.filter((page) => !page.identifier.startsWith('$') && page.sidebar);

	for (const page of filteredPages) {
		const permissions = await getPagePermissions(portClient, page.identifier);
		pagePermissions.push({ page, permissions });
	}
	return pagePermissions;
};

export const getOrg = (portClient: PortClient) => {
	return portClient.organization().get();
};
