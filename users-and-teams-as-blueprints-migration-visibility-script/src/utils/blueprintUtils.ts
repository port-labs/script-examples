import { BlueprintPermissionsWithBlueprint, TeamRelationReference } from '../types';

export const getTargetBlueprintByPath = (
	blueprint: any,
	blueprintsByIdentifierMap: Map<string, any>,
	path: string[],
): any | undefined => {
	let currentBlueprint = blueprint;
	for (const pathPart of path) {
		const relation = currentBlueprint.relations?.[pathPart];
		if (!relation) {
			return undefined;
		}
		const targetBlueprint = blueprintsByIdentifierMap.get(relation.target);
		if (!targetBlueprint) {
			return undefined;
		}
		currentBlueprint = targetBlueprint;
	}
	return currentBlueprint;
};

export const findTeamRelations = (blueprints: any[]): TeamRelationReference[] => {
	return blueprints.reduce<TeamRelationReference[]>((acc, blueprint) => {
		if (!blueprint.relations) return acc;

		for (const [relationId, relation] of Object.entries(blueprint.relations)) {
			if ((relation as any).target === '_team') {
				acc.push({
					blueprintIdentifier: blueprint.identifier,
					relationIdentifier: relationId,
				});
			}
		}
		return acc;
	}, []);
};

const findTeamsInPermissions = (obj: any, path: string[] = []): string[] => {
	if (!obj || typeof obj !== 'object') {
		return [];
	}

	const foundPaths: string[] = [];

	// Check if this object has a teams array with values
	if (Array.isArray(obj.teams) && obj.teams.length > 0) {
		foundPaths.push(path.join('.'));
	}

	// Recursively check all object values
	Object.entries(obj).forEach(([key, value]) => {
		if (key !== 'teams' && typeof value === 'object') {
			const childPaths = findTeamsInPermissions(value, [...path, key]);
			foundPaths.push(...childPaths);
		}
	});

	return foundPaths;
};

export const findBlueprintsWithTeamCalculations = (
	blueprints: any[],
	teamRelations: TeamRelationReference[],
): { blueprint: any; reviewReason: string }[] => {
	return blueprints
		.filter((blueprint) => {
			if (!blueprint.calculationProperties) return false;
			const calculationProperties = blueprint.calculationProperties as Record<string, any>;

			for (const [propName, calcProp] of Object.entries(calculationProperties)) {
				// Check for .team meta property
				const teamPattern = /\.team\b/;
				if (teamPattern.test(calcProp.calculation)) {
					return true;
				}
				// Check for old team relation identifiers
				for (const relation of teamRelations) {
					if (calcProp.calculation.includes(`.relations.${relation.relationIdentifier}`)) {
						return true;
					}
				}
			}
			return false;
		})
		.map((blueprint) => {
			const reasons: string[] = [];
			const calculationProperties = blueprint.calculationProperties as Record<string, any>;
			for (const [propName, calcProp] of Object.entries(calculationProperties)) {
				const teamPattern = /\.team\b/;
				if (teamPattern.test(calcProp.calculation)) {
					reasons.push(`Found reference to team meta property in calculation property '${propName}'`);
				}
				for (const relation of teamRelations) {
					if (calcProp.calculation.includes(`.relations.${relation.relationIdentifier}`)) {
						reasons.push(
							`Found reference to old team relation identifier (.relations.${relation.relationIdentifier}) in calculation property '${propName}'`,
						);
					}
				}
			}
			return {
				blueprint,
				reviewReason: reasons.join('\n'),
			};
		});
};

export const findBlueprintPermissionsWithTeamsValues = (
	blueprintPermissions: BlueprintPermissionsWithBlueprint[],
): BlueprintPermissionsWithBlueprint[] => {
	return blueprintPermissions
		.filter((bp) => {
			const teamPaths = findTeamsInPermissions(bp.permissions);
			return teamPaths.length > 0;
		})
		.map((bp) => {
			const teamPaths = findTeamsInPermissions(bp.permissions);
			return {
				...bp,
				reviewReason: `Explicit teams in permissions: ${teamPaths.map((path) => path || 'root').join(', ')}`,
			};
		});
};
