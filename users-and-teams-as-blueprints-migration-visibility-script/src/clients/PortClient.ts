import Client from './Client';

export default class PortClient extends Client {
	actions() {
		return {
			get: async (version = 'v1', trigger_type?: 'self-service' | 'automation'): Promise<any[]> => {
				const { actions } = await this.request({
					pathname: `/v1/actions`,
					query: {
						trigger_type,
						version,
					},
					method: 'GET',
				});
				return actions;
			},
			create: async (body: any): Promise<any> => {
				const { blueprint: action } = await this.request({
					pathname: `/v1/actions`,
					method: 'POST',
					body,
				});
				return action;
			},
		};
	}
	blueprints() {
		return {
			get: async (): Promise<any[]> => {
				const { blueprints } = await this.request({
					pathname: `/v1/blueprints`,
					method: 'GET',
				});
				return blueprints;
			},
			create: async (body: any, createCatalogPage?: boolean): Promise<any> => {
				const { blueprint } = await this.request({
					pathname: `/v1/blueprints`,
					method: 'POST',
					body,
					query: {
						create_catalog_page: createCatalogPage,
					},
				});
				return blueprint;
			},
			getIdentifierToIdMap: async (): Promise<Record<string, string>> => {
				const { map } = await this.request({
					pathname: `/v1/blueprints/internal/id`,
					method: 'GET',
				});
				return map;
			},
		};
	}
	systemBlueprints() {
		return {
			create: async (name: string) => {
				await this.request({
					pathname: `/v1/blueprints/system/${name}`,
					method: 'POST',
				});
			},
		};
	}
	rawBlueprintAggregations(blueprintId: string) {
		return {
			get: async (): Promise<any> => {
				const { response } = await this.request({
					pathname: `/v1/raw/blueprints/${encodeURIComponent(blueprintId)}/aggregation`,
					method: 'GET',
				});
				return response;
			},
		};
	}

	action(actionIdentifier: string) {
		return {
			get: async (): Promise<any> => {
				const { blueprint } = await this.request({
					pathname: `/v1/actions/${encodeURIComponent(actionIdentifier)}`,
					method: 'GET',
				});
				return blueprint;
			},
			update: async (body: any): Promise<any> => {
				const { action } = await this.request({
					pathname: `/v1/actions/${encodeURIComponent(actionIdentifier)}`,
					method: 'PUT',
					body,
				});
				return action;
			},
			delete: async (): Promise<void> => {
				await this.request({
					pathname: `/v1/actions/${encodeURIComponent(actionIdentifier)}`,
					method: 'DELETE',
				});
			},
			createRun: async (body: any & { entity?: string }): Promise<any> => {
				const { actionRun } = await this.request({
					pathname: `/v1/actions/${encodeURIComponent(actionIdentifier)}/runs`,
					method: 'POST',
					body,
				});
				return actionRun;
			},
			permissions: () => ({
				get: async (): Promise<any> => {
					const { permissions } = await this.request({
						pathname: `/v1/actions/${encodeURIComponent(actionIdentifier)}/permissions`,
						method: 'GET',
					});
					return permissions;
				},
				patch: async (body: any): Promise<any> => {
					const { permissions } = await this.request({
						pathname: `/v1/actions/${encodeURIComponent(actionIdentifier)}/permissions`,
						method: 'PATCH',
						body,
					});
					return permissions;
				},
			}),
		};
	}

	blueprint(blueprintIdentifier: string) {
		return {
			get: async (): Promise<any> => {
				const { blueprint } = await this.request({
					pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}`,
					method: 'GET',
				});
				return blueprint;
			},
			update: async (body: any): Promise<any> => {
				const { blueprint } = await this.request({
					pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}`,
					method: 'PUT',
					body,
				});
				return blueprint;
			},
			patch: async (body: any): Promise<any> => {
				const { blueprint } = await this.request({
					pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}`,
					method: 'PATCH',
					body,
				});
				return blueprint;
			},
			delete: async (): Promise<void> => {
				await this.request({
					pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}`,
					method: 'DELETE',
				});
			},
			relation: (identifier: string) => ({
				rename: async (newIdentifier: string, userAgent?: string): Promise<any> => {
					const { blueprint } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/relations/${encodeURIComponent(identifier)}/rename`,
						method: 'PATCH',
						body: { newRelationIdentifier: newIdentifier },
						headers: {
							'User-Agent': userAgent ?? '',
						},
					});
					return blueprint;
				},
			}),
			permissions: () => ({
				get: async (): Promise<any> => {
					const { permissions } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/permissions`,
						method: 'GET',
					});
					return permissions;
				},
				patch: async (body: any): Promise<any> => {
					const { permissions } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/permissions`,
						method: 'PATCH',
						body,
					});
					return permissions;
				},
			}),
			entities: () => ({
				create: async (
					body: any,
					options?: { upsert?: boolean; merge?: boolean; createMissingRelatedEntities?: boolean; runId?: string },
					userAgent?: string,
				): Promise<any> => {
					const query: Record<string, string | boolean> = {};
					const headers: Record<string, string> = {};

					if (userAgent) {
						headers['User-Agent'] = userAgent;
					}
					if (options?.upsert) {
						query.upsert = true;
					}
					if (options?.merge) {
						query.merge = true;
					}
					if (options?.createMissingRelatedEntities) {
						query.create_missing_related_entities = true;
					}
					if (options?.runId) {
						query.run_id = options.runId;
					}

					const { entity } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/entities`,
						method: 'POST',
						body,
						query,
						headers,
					});
					return entity;
				},
				get: async (options?: {
					exclude_calculated_properties?: boolean;
					attach_title_to_relation?: boolean;
					include?: string[];
					compact?: boolean;
				}): Promise<any[]> => {
					const query: Record<string, string | boolean | string[]> = {};
					if (options?.exclude_calculated_properties) {
						query.exclude_calculated_properties = true;
					}
					if (options?.attach_title_to_relation) {
						query.attach_title_to_relation = true;
					}
					if (options?.include) {
						query.include = options.include;
					}
					if (options?.compact) {
						query.compact = true;
					}
					const { entities } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/entities`,
						method: 'GET',
						query,
					});
					return entities;
				},
			}),
			actions: () => ({
				get: async (): Promise<any[]> => {
					const { actions } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/actions`,
						method: 'GET',
					});
					return actions;
				},
				create: async (body: any): Promise<any> => {
					const { action } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/actions`,
						method: 'POST',
						body,
					});
					return action;
				},
				updateMany: async (body: any): Promise<any[]> => {
					const { actions } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/actions`,
						method: 'PUT',
						body,
					});
					return actions;
				},
			}),
			scorecards: () => ({
				create: async (body: any): Promise<any> => {
					const { scorecard } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/scorecards`,
						method: 'POST',
						body,
					});
					return scorecard;
				},
				get: async (): Promise<any[]> => {
					const { scorecards } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/scorecards`,
						method: 'GET',
					});
					return scorecards;
				},
				updateMany: async (body: any): Promise<any[]> => {
					const { scorecards } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/scorecards`,
						method: 'PUT',
						body,
					});
					return scorecards;
				},
			}),
			action: (actionIdentifier: string, entityIdentifier?: string) => ({
				createRun: async (body: any): Promise<any> => {
					const { run } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/entities/${encodeURIComponent(
							entityIdentifier ?? '',
						)}/actions/${encodeURIComponent(actionIdentifier)}/runs`,
						method: 'POST',
						body,
					});
					return run;
				},
				update: async (body: any): Promise<any> => {
					const { action } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/actions/${encodeURIComponent(
							actionIdentifier,
						)}`,
						method: 'PUT',
						body,
					});
					return action;
				},
				permissions: () => ({
					get: async (): Promise<any> => {
						const { permissions } = await this.request({
							pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/actions/${encodeURIComponent(
								actionIdentifier,
							)}/permissions`,
							method: 'GET',
						});
						return permissions;
					},
					patch: async (body: any): Promise<any> => {
						const { permissions } = await this.request({
							pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/actions/${encodeURIComponent(
								actionIdentifier,
							)}/permissions`,
							method: 'PATCH',
							body,
						});
						return permissions;
					},
				}),
			}),
			entity: (entityIdentifier: string) => ({
				get: async (options?: {
					exclude_calculated_properties?: boolean;
					attach_title_to_relation?: boolean;
					include?: string[];
					compact?: boolean;
				}): Promise<any> => {
					const query: Record<string, string | boolean | string[]> = {};
					if (options?.exclude_calculated_properties) {
						query.exclude_calculated_properties = true;
					}
					if (options?.attach_title_to_relation) {
						query.attach_title_to_relation = true;
					}
					if (options?.include) {
						query.include = options.include;
					}
					if (options?.compact) {
						query.compact = true;
					}
					const { entity } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/entities/${encodeURIComponent(
							entityIdentifier,
						)}`,
						method: 'GET',
						query,
					});
					return entity;
				},
				update: async (body: any, userAgent?: string): Promise<any> => {
					const { entity } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/entities/${encodeURIComponent(
							entityIdentifier,
						)}`,
						method: 'PUT',
						body,
						headers: {
							'User-Agent': userAgent ?? '',
						},
					});
					return entity;
				},
				patch: async (body: any, userAgent?: string): Promise<any> => {
					const { entity } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/entities/${encodeURIComponent(
							entityIdentifier,
						)}`,
						method: 'PATCH',
						body,
						headers: {
							'User-Agent': userAgent ?? '',
						},
					});
					return entity;
				},
				delete: async (userAgent?: string): Promise<boolean> => {
					const { ok } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/entities/${encodeURIComponent(
							entityIdentifier,
						)}`,
						method: 'DELETE',
						headers: {
							'User-Agent': userAgent ?? '',
						},
					});
					return ok;
				},
				patchAggregationProperties: async (body: any, userAgent?: string): Promise<any> => {
					const { entity } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/entities/${encodeURIComponent(
							entityIdentifier,
						)}/aggregation`,
						method: 'PATCH',
						body,
						headers: {
							'User-Agent': userAgent ?? '',
						},
					});
					return entity;
				},
			}),
		};
	}

	scorecards() {
		return {
			get: async (): Promise<any[]> => {
				const { scorecards } = await this.request({
					pathname: `/v1/scorecards`,
					method: 'GET',
				});
				return scorecards;
			},
		};
	}

	entities() {
		return {
			search: async (
				query: any,
				params?: Partial<{
					exclude_calculated_properties: boolean;
					attach_title_to_relation: boolean;
					include: string[];
					compact: boolean;
				}>,
			): Promise<any[]> => {
				const { entities } = await this.request({
					pathname: `/v1/entities/search`,
					method: 'POST',
					body: query,
					query: params,
				});
				return entities;
			},
			topSearch: async (
				blueprintIdentifier: string,
				query: any,
				sort?: any,
				params?: Partial<{
					include: string[];
					exclude: string[];
					limit?: number;
				}>,
			): Promise<{ entities: any[]; hasMoreEntities: boolean }> => {
				const { entities, hasMoreEntities } = await this.request({
					pathname: `/v1/blueprints/${blueprintIdentifier}/entities/top-search`,
					method: 'POST',
					body: { ...params, query, sort },
				});
				return { entities, hasMoreEntities };
			},
			scan: async (
				blueprintIdentifier: string,
				query: any,
				params?: Partial<{
					include: string[];
					exclude: string[];
					limit?: number;
					from?: string;
				}>,
			): Promise<{ entities: any[]; next: string }> => {
				const { entities, next } = await this.request({
					pathname: `/v1/blueprints/${blueprintIdentifier}/entities/search`,
					method: 'POST',
					body: { query },
					query: { ...params, limit: params?.limit?.toString() },
				});
				return { entities, next };
			},
			group: async (
				blueprintIdentifier: string,
				query: any,
				grouping: any,
			): Promise<{ groups: any; hasMoreGroups: boolean }> => {
				const { groups, hasMoreGroups } = await this.request({
					pathname: `/v1/blueprints/${blueprintIdentifier}/entities/group`,
					method: 'POST',
					body: { query, grouping },
				});
				return { groups, hasMoreGroups };
			},
			related: async (query: any) => {
				const { relatedEntities } = await this.request({
					pathname: `/v1/entities/related`,
					method: 'GET',
					query,
				});
				return relatedEntities;
			},
		};
	}

	organization() {
		return {
			get: async (): Promise<any> => {
				const { organization } = await this.request({
					pathname: `/v1/organization`,
					method: 'GET',
				});
				return organization;
			},
			update: async (body: any): Promise<any> => {
				const organization = await this.request({
					pathname: `/v1/organization`,
					method: 'PUT',
					body,
				});
				return organization;
			},
			addAiFeatureFlag: async (): Promise<any> => {
				const organization = await this.request({
					pathname: `/v1/organization/ai/register`,
					method: 'PATCH',
					body: {},
				});
				return organization;
			},
		};
	}

	apps() {
		return {
			get: async (fields?: any[]): Promise<any> => {
				const { apps } = await this.request({
					pathname: `/v1/apps`,
					method: 'GET',
					query: {
						fields,
					},
				});
				return apps;
			},
		};
	}

	integrations() {
		return {
			getAll: async (): Promise<any[]> => {
				const { integrations } = await this.request({
					pathname: `/v1/integration`,
					method: 'GET',
				});
				return integrations;
			},
			get: async (installationId: string): Promise<any> => {
				const { integration } = await this.request({
					pathname: `/v1/integration/${installationId}`,
					method: 'GET',
				});
				return integration;
			},
			create: async (body: Partial<any>): Promise<{ integration: any }> => {
				const integration = await this.request({
					pathname: `/v1/integration`,
					method: 'POST',
					body,
				});
				return integration;
			},
			patchConfig: async (
				installationId: string,
				body: { config: any['config'] },
			): Promise<{ integration: any }> => {
				const integration = await this.request({
					pathname: `/v1/integration/${installationId}/config`,
					method: 'PATCH',
					body,
				});
				return integration;
			},
		};
	}

	webhooks() {
		return {
			get: async (): Promise<{ integrations: any[] }> => {
				const webhookIntegrations = await this.request({
					pathname: `/v1/webhooks`,
					method: 'GET',
				});
				return webhookIntegrations;
			},
			create: async (data: Omit<any, 'userId'>): Promise<{ integration: any }> => {
				const webhookIntegration = await this.request({
					pathname: `/v1/webhooks`,
					method: 'POST',
					body: data,
				});
				return webhookIntegration;
			},
		};
	}

	users() {
		return {
			get: async (fields?: any[]): Promise<any[]> => {
				const { users } = await this.request({
					pathname: `/v1/users`,
					method: 'GET',
					query: {
						fields,
					},
					body: {},
				});
				return users;
			},
		};
	}

	user(userEmail: string) {
		return {
			patch: async (body: any): Promise<any> => {
				const { user } = await this.request({
					pathname: `/v1/users/${userEmail}`,
					method: 'PATCH',
					body,
				});
				return user;
			},
		};
	}

	teams() {
		return {
			get: async (fields: any[] = ['description', 'name', 'provider']): Promise<any[]> => {
				const { teams } = await this.request({
					pathname: `/v1/teams`,
					method: 'GET',
					query: {
						fields,
					},
				});
				return teams;
			},
		};
	}

	sidebar(sidebarIdentifier: string) {
		return {
			get: async (): Promise<any> => {
				const { sidebar } = await this.request({
					pathname: `/v1/sidebars/${sidebarIdentifier}`,
					method: 'GET',
				});
				return sidebar;
			},
			createFolder: async (body: Partial<any>): Promise<{ ok: boolean; folder: any }> => {
				const sidebarItem = await this.request({
					pathname: `/v1/sidebars/${sidebarIdentifier}/folders`,
					method: 'POST',
					body,
				});
				return sidebarItem;
			},
		};
	}

	pages() {
		return {
			get: async (): Promise<any[]> => {
				const { pages } = await this.request({
					pathname: `/v1/pages?compact=false`,
					method: 'GET',
				});
				return pages;
			},
			create: async (body: any): Promise<any> => {
				const page = await this.request({
					pathname: `/v1/pages`,
					method: 'POST',
					body,
				});
				return page;
			},
		};
	}

	page(pageIdentifier: string) {
		return {
			get: async (): Promise<any> => {
				const { page } = await this.request({
					pathname: `/v1/pages/${pageIdentifier}`,
					method: 'GET',
				});
				return page;
			},
			update: async (body: any): Promise<any> => {
				const { page } = await this.request({
					pathname: `/v1/pages/${pageIdentifier}`,
					method: 'PUT',
					body,
				});
				return page;
			},
			permissions: () => ({
				get: async (): Promise<any> => {
					const { permissions } = await this.request({
						pathname: `/v1/pages/${pageIdentifier}/permissions`,
						method: 'GET',
					});
					return permissions;
				},
				patch: async (body: any): Promise<any> => {
					const { permissions } = await this.request({
						pathname: `/v1/pages/${pageIdentifier}/permissions`,
						method: 'PATCH',
						body,
					});
					return permissions;
				},
			}),
			delete: () =>
				this.request({
					pathname: `/v1/pages/${pageIdentifier}`,
					method: 'DELETE',
				}),
		};
	}

	runs() {
		return {
			get: async (limit?: number, version?: string): Promise<any[]> => {
				const { runs } = await this.request({
					pathname: `/v1/actions/runs${limit ? `?limit=${limit}&version=${version ?? 'v1'}` : ''}`,
					method: 'GET',
				});
				return runs;
			},
		};
	}

	run(runId: string) {
		return {
			get: async (): Promise<any> => {
				const { run } = await this.request({
					pathname: `/v1/actions/runs/${runId}`,
					method: 'GET',
				});
				return run;
			},
			patch: async (body: Partial<any>, userAgent?: string): Promise<any> => {
				const headers: Record<string, string> = {};
				if (userAgent) {
					headers['User-Agent'] = userAgent;
				}
				const { run } = await this.request({
					pathname: `/v1/actions/runs/${runId}`,
					method: 'PATCH',
					body,
					headers,
				});
				return run;
			},
		};
	}

	checklists() {
		return {
			get: async () => {
				const { checklists } = await this.request({
					pathname: `/v1/checklists`,
					method: 'GET',
				});
				return checklists;
			},
		};
	}

	checklist(checklistIdentifier: string) {
		return {
			get: async () => {
				const { checklist } = await this.request({
					pathname: `/v1/checklists/${checklistIdentifier}`,
					method: 'GET',
				});
				return checklist;
			},

			items: () => ({
				create: async (body: any[]) => {
					const { item } = await this.request({
						pathname: `/v1/checklists/${checklistIdentifier}/items`,
						method: 'POST',
						body,
					});
					return item;
				},
			}),

			item: (itemIdentifier: string) => ({
				delete: async () => {
					const { item } = await this.request({
						pathname: `/v1/checklists/${checklistIdentifier}/item/${itemIdentifier}`,
						method: 'DELETE',
					});
					return item;
				},
			}),
		};
	}
}
