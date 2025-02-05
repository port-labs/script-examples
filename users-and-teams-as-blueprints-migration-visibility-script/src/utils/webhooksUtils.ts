import { TeamRelationReference, WebhookWithLocation } from '../types';

const findTeamReferencesInMappings = (
	mappings: any[] | undefined,
	teamRelations: TeamRelationReference[],
): string[] => {
	const paths: string[] = [];
	if (!mappings?.length) {
		return paths;
	}

	for (const mapping of mappings) {
		if (mapping.entity?.team) {
			paths.push('Direct team mapping in entity configuration');
		}

		// Check for relation references in any string value
		const checkValue = (value: unknown) => {
			if (typeof value === 'string') {
				for (const relation of teamRelations) {
					if (value.includes(`.relations.${relation.relationIdentifier}`)) {
						paths.push(
							`Reference to team relation '${relation.relationIdentifier}' from blueprint '${relation.blueprintIdentifier}'`,
						);
					}
				}
			}
		};

		// Check entity properties and relations
		if (mapping.entity.properties) {
			Object.values(mapping.entity.properties).forEach(checkValue);
		}
		if (mapping.entity.relations) {
			Object.values(mapping.entity.relations).forEach(checkValue);
		}

		if (mapping.entity.relations) {
			const relationsMappingKeys = Object.keys(mapping.entity.relations);
			for (const relation of teamRelations) {
				if (relationsMappingKeys.includes(relation.relationIdentifier)) {
				paths.push(
					`Mapping to team relation '${relation.relationIdentifier}' from blueprint '${relation.blueprintIdentifier}'`,
					);
				}
			}
		}
	}

	return paths;
};

export const findWebhooksWithTeamMapping = (
	webhooksResponse: { integrations: any[] },
	teamRelations: TeamRelationReference[],
): WebhookWithLocation[] => {
	const webhooks = webhooksResponse.integrations;
	return webhooks.reduce<WebhookWithLocation[]>((acc, webhook) => {
		const paths = findTeamReferencesInMappings(webhook.mappings, teamRelations);
		if (paths.length > 0) {
			acc.push({
				webhook,
				teamReferencePaths: paths,
				reviewReason: 'Team mapping in entity configuration',
			});
		}

		return acc;
	}, []);
};
