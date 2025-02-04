import { PagePermissionsWithPage, PageWithLocation, TeamRelationReference } from '../types';

const TABLE_WIDGET_TYPES = {
	TABLE_ENTITIES_EXPLORER: 'table-entities-explorer',
	TABLE_ENTITIES_EXPLORER_BY_DIRECTION: 'table-entities-explorer-by-direction',
	DASHBOARD_WIDGET: 'dashboard-widget',
} as const;

type PropertiesSettings = {
	hidden?: string[];
	shown?: string[];
	order: string[];
};

type SortBy = {
	property: string;
	order: 'asc' | 'desc';
};

type Dataset = {
	combinator: 'and' | 'or';
	rules: Array<{
		operator: string;
		property: string;
		value: any;
	}>;
};

type QueryBuilderConfig = {
	groupSettings?: {
		groupBy: string[];
	};
	sortSettings?: {
		sortBy: SortBy[];
	};
	filterSettings?: {
		filterBy: Dataset;
	};
	propertiesSettings?: PropertiesSettings;
	tabIndex?: number;
	hidden?: boolean;
	title?: string;
	description?: string;
	dataset?: Dataset;
	targetBlueprint?: string;
	relatedProperty?: string;
};

type TeamReference = {
	reference: string;
	widgetTitle: string;
}

const findTeamReferencesInBlueprintConfig = (config: QueryBuilderConfig, teamRelations: TeamRelationReference[]): string[] => {
	const references: string[] = [];

	// Check propertiesSettings
	if (config.propertiesSettings) {
		const { shown, hidden, order } = config.propertiesSettings;

		// Check for team relation identifiers
		teamRelations.forEach((relation) => {
			if (shown?.includes(relation.relationIdentifier)) {
				references.push(`'${relation.relationIdentifier}' relation of blueprint '${relation.blueprintIdentifier}' in shown properties`);
			}
			if (hidden?.includes(relation.relationIdentifier)) {
				references.push(`'${relation.relationIdentifier}' relation of blueprint '${relation.blueprintIdentifier}' in hidden properties`);
			}
			if (order?.includes(relation.relationIdentifier)) {
				references.push(`'${relation.relationIdentifier}' relation of blueprint '${relation.blueprintIdentifier}' in properties order`);
			}
		});
	}

	// Check groupSettings
	if (config.groupSettings?.groupBy) {
		teamRelations.forEach((relation) => {
			if (config.groupSettings?.groupBy.includes(relation.relationIdentifier)) {
				references.push(`'${relation.relationIdentifier}' relation of blueprint '${relation.blueprintIdentifier}' in group by`);
			}
		});
	}

	// Check sortSettings
	if (config.sortSettings?.sortBy) {
		config.sortSettings.sortBy.forEach((sort) => {
			teamRelations.forEach((relation) => {
				if (sort.property === relation.relationIdentifier || sort.property.startsWith(`${relation.relationIdentifier}.`)) {
					references.push(`'${relation.relationIdentifier}' relation of blueprint '${relation.blueprintIdentifier}' in sort settings`);
				}
			});
		});
	}

	// Check filterSettings
	if (config.filterSettings?.filterBy?.rules) {
		config.filterSettings.filterBy.rules.forEach((rule) => {
			teamRelations.forEach((relation) => {
				if (rule.property === relation.relationIdentifier || rule.property.startsWith(`${relation.relationIdentifier}.`)) {
					references.push(`'${relation.relationIdentifier}' relation of blueprint '${relation.blueprintIdentifier}' in filter rules`);
				}
			});
		});
	}

	return references;
};

const findTeamReferencesInWidget = (
	widget: any,
	teamRelations: TeamRelationReference[],
): TeamReference[] => {
	const references: TeamReference[] = [];
	let currentReference: TeamReference | undefined;

	// Check excludedFields
	if (Array.isArray(widget.excludedFields)) {
		const hasTeamField = widget.excludedFields.some((field: string) =>
			teamRelations.some(
				(relation) => field === `relations.${relation.relationIdentifier}` || field.startsWith(`relations.${relation.relationIdentifier}.`),
			),
		);
		if (hasTeamField) {
			currentReference = {
				reference: 'Team relation identifier in excludedFields',
				widgetTitle: widget.title || widget.id,
			};
		}
	}

	// Check blueprintConfig
	if (widget.blueprintConfig && typeof widget.blueprintConfig === 'object') {
		Object.entries(widget.blueprintConfig).forEach(([bpId, config]: [string, any]) => {
			const configReferences = findTeamReferencesInBlueprintConfig(config, teamRelations);
			if (configReferences.length > 0) {
				currentReference = {
					reference: (currentReference ? [currentReference.reference, ...configReferences] : configReferences).join('<br/>'),
					widgetTitle: widget.title || widget.id,
				};
			}
		});
	}

	if (currentReference) {
		references.push(currentReference);
	}

	// Check for nested widgets (for dashboard widgets)
	if (widget.type === TABLE_WIDGET_TYPES.DASHBOARD_WIDGET && Array.isArray(widget.widgets)) {
		widget.widgets.forEach((nestedWidget: any) => {
			const nestedResult = findTeamReferencesInWidget(nestedWidget, teamRelations);
			if (nestedResult.length > 0) {
				references.push(...nestedResult);
			}
		});
	}

	return references;
};

export const findPagesWithTeamReferences = (pages: any[], teamRelations: TeamRelationReference[]): PageWithLocation[] => {
	const pagesWithTeamReferences: PageWithLocation[] = [];

	for (const page of pages) {
		if (!page.widgets) {
			continue;
		}

		for (const widget of page.widgets) {
			const references = findTeamReferencesInWidget(widget, teamRelations);
			if (references.length > 0) {
				references.forEach((reference) => {
					pagesWithTeamReferences.push({
						page,
						widgetId: widget.id,
						widgetTitle: reference.widgetTitle,
						blueprintIdentifier: Object.keys(widget.blueprintConfig || {})[0] || '',
						relationReferences: [reference.reference],
					});
				});
			}
		}
	}

	return pagesWithTeamReferences;
};

export const findPagesWithTeamPermissions = (pagePermissions: PagePermissionsWithPage[]): PagePermissionsWithPage[] => {
	return pagePermissions
		.map((pagePermission) => {
			const permissions = pagePermission.permissions.read;
			if (permissions?.teams?.length) {
				return {
					...pagePermission,
					reviewReason: 'Explicit teams in page permissions',
				};
			}
			return pagePermission;
		})
		.filter(
			(pagePermission): pagePermission is PagePermissionsWithPage & { reviewReason: string } =>
				pagePermission.reviewReason !== undefined,
		);
};