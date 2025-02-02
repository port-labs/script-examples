import { PagePermissionsWithPage, PageWithLocation } from '../types';

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

const findTeamReferencesInBlueprintConfig = (config: QueryBuilderConfig, teamRelationIdentifiers: string[]): string[] => {
	const references: string[] = [];

	// Check propertiesSettings
	if (config.propertiesSettings) {
		const { shown, hidden, order } = config.propertiesSettings;

		// Check for team relation identifiers
		teamRelationIdentifiers.forEach((identifier) => {
			if (shown?.includes(identifier)) {
				references.push(`${identifier} in shown properties`);
			}
			if (hidden?.includes(identifier)) {
				references.push(`${identifier} in hidden properties`);
			}
			if (order?.includes(identifier)) {
				references.push(`${identifier} in properties order`);
			}
		});
	}

	// Check groupSettings
	if (config.groupSettings?.groupBy) {
		teamRelationIdentifiers.forEach((identifier) => {
			if (config.groupSettings?.groupBy.includes(identifier)) {
				references.push(`${identifier} in group by`);
			}
		});
	}

	// Check sortSettings
	if (config.sortSettings?.sortBy) {
		config.sortSettings.sortBy.forEach((sort) => {
			teamRelationIdentifiers.forEach((identifier) => {
				if (sort.property === identifier || sort.property.startsWith(`${identifier}.`)) {
					references.push(`${identifier} in sort settings`);
				}
			});
		});
	}

	// Check filterSettings
	if (config.filterSettings?.filterBy?.rules) {
		config.filterSettings.filterBy.rules.forEach((rule) => {
			teamRelationIdentifiers.forEach((identifier) => {
				if (rule.property === identifier || rule.property.startsWith(`${identifier}.`)) {
					references.push(`${identifier} in filter rules`);
				}
			});
		});
	}

	return references;
};

const findTeamReferencesInWidget = (
	widget: any,
	teamRelationIdentifiers: string[],
): { references: string[]; widgetTitle?: string } => {
	const references: string[] = [];

	// Check excludedFields
	if (Array.isArray(widget.excludedFields)) {
		const hasTeamField = widget.excludedFields.some((field: string) =>
			teamRelationIdentifiers.some(
				(identifier) => field === `relations.${identifier}` || field.startsWith(`relations.${identifier}.`),
			),
		);
		if (hasTeamField) {
			references.push('Team field in excludedFields');
		}
	}

	// Check blueprintConfig
	if (widget.blueprintConfig && typeof widget.blueprintConfig === 'object') {
		Object.entries(widget.blueprintConfig).forEach(([bpId, config]: [string, any]) => {
			const configReferences = findTeamReferencesInBlueprintConfig(config, teamRelationIdentifiers);
			references.push(...configReferences);
		});
	}

	// Check for nested widgets (for dashboard widgets)
	if (widget.type === TABLE_WIDGET_TYPES.DASHBOARD_WIDGET && Array.isArray(widget.widgets)) {
		widget.widgets.forEach((nestedWidget: any) => {
			const nestedResult = findTeamReferencesInWidget(nestedWidget, teamRelationIdentifiers);
			if (nestedResult.references.length > 0) {
				references.push(...nestedResult.references);
			}
		});
	}

	return {
		references,
		widgetTitle: references.length > 0 ? widget.title : undefined,
	};
};

export const findPagesWithTeamReferences = (pages: any[], teamRelationIdentifiers: string[]): PageWithLocation[] => {
	const pagesWithTeamReferences: PageWithLocation[] = [];

	for (const page of pages) {
		if (!page.widgets) {
			continue;
		}

		for (const widget of page.widgets) {
			const { references, widgetTitle } = findTeamReferencesInWidget(widget, teamRelationIdentifiers);
			if (references.length > 0) {
				pagesWithTeamReferences.push({
					page,
					widgetId: widget.id,
					widgetTitle,
					blueprintIdentifier: Object.keys(widget.blueprintConfig || {})[0] || '',
					relationReferences: references,
				});
				break; // Found a reference in this page, no need to check other widgets
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
