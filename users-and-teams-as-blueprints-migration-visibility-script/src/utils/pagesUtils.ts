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

type BlueprintConfig = {
	[BlueprintName: string]: QueryBuilderConfig;
};

const findTeamRelationsInBlueprintConfig = (
	blueprintConfig: BlueprintConfig,
	teamRelations: TeamRelationReference[],
	blueprintIdentifier: string,
): string[] => {
	const references: string[] = [];

	// Check properties order and shown arrays
	for (const [configKey, config] of Object.entries(blueprintConfig)) {
		if (config.propertiesSettings) {
			const { order = [], shown = [] } = config.propertiesSettings;
			for (const relation of teamRelations) {
				if (order.includes(relation.relationIdentifier) || shown.includes(relation.relationIdentifier)) {
					references.push(
						`Found reference to team relation '${relation.relationIdentifier}' in properties settings for blueprint '${blueprintIdentifier}'`,
					);
				}
			}
		}

		// Check group by settings
		if (config.groupSettings?.groupBy) {
			for (const groupField of config.groupSettings.groupBy) {
				for (const relation of teamRelations) {
					if (groupField === relation.relationIdentifier) {
						references.push(
							`Found reference to team relation '${relation.relationIdentifier}' in group settings for blueprint '${blueprintIdentifier}'`,
						);
					}
				}
			}
		}

		// Check sort settings
		if (config.sortSettings?.sortBy) {
			for (const sort of config.sortSettings.sortBy) {
				for (const relation of teamRelations) {
					if (sort.property === relation.relationIdentifier) {
						references.push(
							`Found reference to team relation '${relation.relationIdentifier}' in sort settings for blueprint '${blueprintIdentifier}'`,
						);
					}
				}
			}
		}

		// Check filter settings
		if (config.filterSettings?.filterBy?.rules) {
			for (const rule of config.filterSettings.filterBy.rules) {
				for (const relation of teamRelations) {
					if (rule.property === relation.relationIdentifier) {
						references.push(
							`Found reference to team relation '${relation.relationIdentifier}' in filter settings for blueprint '${blueprintIdentifier}'`,
						);
					}
				}
			}
		}
	}

	return references;
};

const isDashboardWidget = (widget: any): boolean => {
	return widget.type === TABLE_WIDGET_TYPES.DASHBOARD_WIDGET;
};

const isTableWidget = (widget: any): boolean => {
	return (
		widget.type === TABLE_WIDGET_TYPES.TABLE_ENTITIES_EXPLORER ||
		widget.type === TABLE_WIDGET_TYPES.TABLE_ENTITIES_EXPLORER_BY_DIRECTION
	);
};

const findTeamRelationsInWidget = (
	widget: any,
	blueprintIdentifier: string,
): { references: string[]; widgetTitle?: string } => {
	const references: string[] = [];

	// Check excludedFields
	if (Array.isArray(widget.excludedFields)) {
		const hasTeamField = widget.excludedFields.some((field: string) => field === 'teams' || field.startsWith('teams.'));
		if (hasTeamField) {
			references.push(`Found reference to 'teams' in excludedFields`);
		}
	}

	// Check blueprintConfig
	if (widget.blueprintConfig && typeof widget.blueprintConfig === 'object') {
		Object.entries(widget.blueprintConfig).forEach(([bpId, config]: [string, any]) => {
			if (config.propertiesSettings?.shown?.includes('teams')) {
				references.push(`Found reference to 'teams' in shown properties`);
			}
			if (config.propertiesSettings?.order?.includes('teams')) {
				references.push(`Found reference to 'teams' in properties order`);
			}
			if (config.sortSettings?.sortBy) {
				const hasTeamSort = config.sortSettings.sortBy.some(
					(sort: any) => sort.property === 'teams' || sort.property.startsWith('teams.'),
				);
				if (hasTeamSort) {
					references.push(`Found reference to 'teams' in sort settings`);
				}
			}
			if (config.filterSettings?.filterBy?.rules) {
				const hasTeamFilter = config.filterSettings.filterBy.rules.some(
					(rule: any) => rule.property === 'teams' || rule.property.startsWith('teams.'),
				);
				if (hasTeamFilter) {
					references.push(`Found reference to 'teams' in filter rules`);
				}
			}
		});
	}

	// Check for nested widgets
	if (Array.isArray(widget.widgets)) {
		widget.widgets.forEach((nestedWidget: any) => {
			const nestedResult = findTeamRelationsInWidget(nestedWidget, blueprintIdentifier);
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

export const findPagesWithTeamRelations = (
	pages: any[],
	teamInheritanceBlueprints: string[],
	teamRelations: TeamRelationReference[],
): PageWithLocation[] => {
	const pagesToReview: PageWithLocation[] = [];

	for (const page of pages) {
		for (const widget of page.widgets) {
			// For each blueprint that has team inheritance, check if the widget references it
			for (const blueprintIdentifier of teamInheritanceBlueprints) {
				const { references, widgetTitle } = findTeamRelationsInWidget(widget, blueprintIdentifier);

				if (references.length > 0) {
					pagesToReview.push({
						page,
						widgetId: widget.id,
						widgetTitle: widgetTitle || widget.title,
						blueprintIdentifier,
						relationReferences: references,
					});
				}
			}
		}
	}

	return pagesToReview;
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
