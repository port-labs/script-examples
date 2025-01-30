
import { IntegrationWithLocation, TeamRelationReference } from '../types';

const findTeamMappings = (obj: unknown): string[] => {
	const paths: string[] = [];

	if (typeof obj !== 'object' || obj === null) {
		return paths;
	}

	for (const [key, value] of Object.entries(obj)) {
		// Found a team mapping in entity configuration
		if (
			key === 'team' ||
			key === 'teams' ||
			(typeof value === 'string' && (value.includes('.team') || value.includes('teams')))
		) {
			paths.push('Direct team mapping in entity configuration');
			continue;
		}

		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				const result = findTeamMappings(value[i]);
				paths.push(...result);
			}
		} else if (typeof value === 'object' && value !== null) {
			const result = findTeamMappings(value);
			paths.push(...result);
		}
	}

	return paths;
};

export const findIntegrationsWithTeamReference = (
	integrations: any[],
	teamRelations: TeamRelationReference[],
): IntegrationWithLocation[] => {
	return integrations.reduce<IntegrationWithLocation[]>((acc, integration) => {
		if (!integration.config) {
			return acc;
		}

		const paths = findTeamMappings(integration.config);
		if (paths.length > 0) {
			acc.push({
				integration,
				teamReferencePaths: paths,
				reviewReason: 'Team mapping in entity configuration',
			});
		}
		return acc;
	}, []);
};
