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
			}
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
			}
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
			permissions: () => ({
				get: async (): Promise<any> => {
					const { permissions } = await this.request({
						pathname: `/v1/actions/${encodeURIComponent(actionIdentifier)}/permissions`,
						method: 'GET',
					});
					return permissions;
				}
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
			permissions: () => ({
				get: async (): Promise<any> => {
					const { permissions } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/permissions`,
						method: 'GET',
					});
					return permissions;
				}
			}),
			entities: () => ({
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
			}),
			scorecards: () => ({
				get: async (): Promise<any[]> => {
					const { scorecards } = await this.request({
						pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/scorecards`,
						method: 'GET',
					});
					return scorecards;
				}
			}),
			action: (actionIdentifier: string, entityIdentifier?: string) => ({
				permissions: () => ({
					get: async (): Promise<any> => {
						const { permissions } = await this.request({
							pathname: `/v1/blueprints/${encodeURIComponent(blueprintIdentifier)}/actions/${encodeURIComponent(
								actionIdentifier,
							)}/permissions`,
							method: 'GET',
						});
						return permissions;
					}
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
				}
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
			}
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
			}
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
			}
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
			}
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

	pages() {
		return {
			get: async (): Promise<any[]> => {
				const { pages } = await this.request({
					pathname: `/v1/pages?compact=false`,
					method: 'GET',
				});
				return pages;
			}
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
			permissions: () => ({
				get: async (): Promise<any> => {
					const { permissions } = await this.request({
						pathname: `/v1/pages/${pageIdentifier}/permissions`,
						method: 'GET',
					});
					return permissions;
				}
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
		};
	}
}
