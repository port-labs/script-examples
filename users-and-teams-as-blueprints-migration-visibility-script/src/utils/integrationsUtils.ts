
import { IntegrationWithLocation, TeamRelationReference } from '../types';

const findTeamMappings = (obj: unknown, teamRelations: TeamRelationReference[]): string[] => {
	const paths: string[] = [];

	if (typeof obj !== 'object' || obj === null) {
		return paths;
	}

	for (const [key, value] of Object.entries(obj)) {
		// Found a team mapping in entity configuration
		if (
			key === 'team'
		) {
			paths.push('Direct team mapping in entity configuration');
			continue;
		}

		if (key === 'relations') {
			const relationsMappingKeys = Object.keys(value);
			for (const relation of teamRelations) {
				if (relationsMappingKeys.includes(relation.relationIdentifier)) {
					paths.push(
						`Mapping to team relation '${relation.relationIdentifier}' from blueprint '${relation.blueprintIdentifier}'`,
					);
				}
			}
		}

		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				const result = findTeamMappings(value[i], teamRelations);
				paths.push(...result);
			}
		} else if (typeof value === 'object' && value !== null) {
			const result = findTeamMappings(value, teamRelations);
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
			acc.push({
				integration,
				teamReferencePaths: [],
				reviewReason: 'GitOps file needs to be reviewed',
			});
			return acc;
		}

		const paths = findTeamMappings(integration.config, teamRelations);
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
