import {
	ActionPermissionReviewReason,
	ActionPermissionsWithAction,
	ActionWithJQLocation,
	TeamRelationReference,
} from '../types';

const findTeamReferences = (obj: unknown, teamRelations: TeamRelationReference[]): string[] => {
	const paths: string[] = [];

	if (typeof obj === 'string') {
		// Check for team references
		const teamPattern = /\.team\b/;
		if (teamPattern.test(obj)) {
			paths.push('Found reference to team property');
		}
		// Check for specific team relation patterns
		for (const relation of teamRelations) {
			const relationPattern = new RegExp(`\\.relations\\.${relation.relationIdentifier}\\b`);
			if (relationPattern.test(obj)) {
				paths.push(`Found reference to old team relation identifier (.relations.${relation.relationIdentifier})`);
			}
		}
		return paths;
	}

	if (typeof obj !== 'object' || obj === null) {
		return paths;
	}

	const stringified = JSON.stringify(obj);
	if (stringified) {
		const stringPaths = findTeamReferences(stringified, teamRelations);
		paths.push(...stringPaths);
	}

	for (const [key, value] of Object.entries(obj)) {
		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				const result = findTeamReferences(value[i], teamRelations);
				paths.push(...result);
			}
		} else if (typeof value === 'object' && value !== null) {
			const result = findTeamReferences(value, teamRelations);
			paths.push(...result);
		} else if (typeof value === 'string') {
			const result = findTeamReferences(value, teamRelations);
			paths.push(...result);
		}
	}

	return [...new Set(paths)];
};

export const findActionsWithTeamQuery = (
	actions: any[],
	teamRelations: TeamRelationReference[],
): ActionWithJQLocation[] => {
	return actions.reduce<ActionWithJQLocation[]>((acc, action) => {
		const paths = findTeamReferences(action, teamRelations);
		if (paths.length > 0) {
			acc.push({
				action,
				jqQueryPath: paths.map((path) => {
					if (path.includes('trigger.conditions')) {
						return 'Team reference in trigger conditions';
					}
					if (path.includes('action.mapping')) {
						return 'Team reference in mapping configuration';
					}
					if (path.includes('action.url')) {
						return 'Team reference in webhook URL';
					}
					if (path.includes('action.body')) {
						return 'Team reference in webhook body';
					}
					return path;
				}),
			});
		}
		return acc;
	}, []);
};

export const findActionsPermissionsWithExplicitTeams = (
	actionsPermissions: ActionPermissionsWithAction[],
): ActionPermissionsWithAction[] => {
	return actionsPermissions.reduce<ActionPermissionsWithAction[]>((acc, actionPermission) => {
		const { permissions, action } = actionPermission;
		let reviewReason: ActionPermissionReviewReason | null = null;

		if (permissions.execute?.teams?.length) {
			reviewReason = 'Explicit teams in Execute permissions';
		} else if (permissions.approve?.teams?.length) {
			reviewReason = 'Explicit teams in Approve permissions';
		}

		if (reviewReason) {
			acc.push({ action, permissions, reviewReason });
		}

		return acc;
	}, []);
};

export const findActionsPermissionsWithDynamicTeamFilters = (
	actionsPermissions: ActionPermissionsWithAction[],
	teamRelations: TeamRelationReference[],
): ActionPermissionsWithAction[] => {
	return actionsPermissions.reduce<ActionPermissionsWithAction[]>((acc, actionPermission) => {
		const { permissions, action } = actionPermission;
		let reviewReason: ActionPermissionReviewReason | null = null;

		if (permissions.execute?.policy) {
			const references = findTeamReferences(permissions.execute.policy, teamRelations);
			if (references.length > 0) {
				reviewReason = references.join('\n');
			}
		} else if (permissions.approve?.policy) {
			const references = findTeamReferences(permissions.approve.policy, teamRelations);
			if (references.length > 0) {
				reviewReason = references.join('\n');
			}
		}

		if (reviewReason) {
			acc.push({ action, permissions, reviewReason });
		}

		return acc;
	}, []);
};

// Keeping this for backward compatibility if needed
export const findActionsPermissionsWithTeamsValues = (
	actionsPermissions: ActionPermissionsWithAction[],
	teamRelations: TeamRelationReference[],
): ActionPermissionsWithAction[] => {
	const withExplicitTeams = findActionsPermissionsWithExplicitTeams(actionsPermissions);
	const withDynamicFilters = findActionsPermissionsWithDynamicTeamFilters(actionsPermissions, teamRelations);
	return [...withExplicitTeams, ...withDynamicFilters];
};
