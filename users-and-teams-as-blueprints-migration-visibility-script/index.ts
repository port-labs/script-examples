import fs from 'fs';
import path from 'path';
import process from 'process';
import colors from 'colors/safe';

import { BlueprintWithCount, Config } from './src/types';
import { findActionsPermissionsWithTeamsValues, findActionsWithTeamQuery } from './src/utils/actionsUtils';
import {
	findBlueprintPermissionsWithTeamsValues,
	findTeamRelations,
	getTargetBlueprintByPath,
	findBlueprintsWithTeamCalculations,
} from './src/utils/blueprintUtils';
import { findIntegrationsWithTeamReference } from './src/utils/integrationsUtils';
import { findPagesWithTeamPermissions, findPagesWithTeamReferences } from './src/utils/pagesUtils';
import {
	countEntitiesWithTeamValues,
	getAllActions,
	getAllActionsPermissions,
	getAllBlueprintPermissions,
	getAllBlueprints,
	getAllIntegrations,
	getAllPages,
	getAllPagesPermissions,
	getAllWebhooks,
	getOrg,
	getPortApiClient,
} from './src/utils/portApiUtils';
import { generateReport } from './src/utils/reportUtils';
import { findWebhooksWithTeamMapping } from './src/utils/webhooksUtils';

const TEAM_BLUEPRINT_IDENTIFIER = '_team';

function loadConfig(): Config | undefined {
	const configPath = path.join(process.cwd(), 'config.json');
	
	try {
		if (!fs.existsSync(configPath)) {
			throw new Error('Config file not found. Please create a config.json file based on config.example.json');
		}
		
		const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
		
		// Validate required fields
		if (!config.CLIENT_ID || !config.CLIENT_SECRET) {
			throw new Error('Missing required fields in config.json');
		}

		if (config.REGION && config.REGION !== 'eu' && config.REGION !== 'us') {
			throw new Error('REGION must be either "eu" or "us"');
		}
		
		return {...config, REGION: config.REGION || 'eu'};
	} catch (error) {
		if (error instanceof Error) {
			console.error('Error loading config:', error.message);
		} else {
			console.error('Unknown error loading config');
		}
	}
}

const start = async () => {
	const config = loadConfig();
	if (config) {
		const { REGION, CLIENT_ID, CLIENT_SECRET } = config;
		const redactedClientId = CLIENT_ID.slice(0, 6) + '...' + CLIENT_ID.slice(-4);
		console.log(colors.green(`Starting migration with client id of - ${redactedClientId}`));
		try {
				const orgPortClient = getPortApiClient(REGION, CLIENT_ID, CLIENT_SECRET);
				const org = await getOrg(orgPortClient);
				console.log(`Org: ${colors.cyan(org.name)}`);
				const orgBlueprints = await getAllBlueprints(orgPortClient);
				const orgBlueprintsByIdentifierMap = new Map(orgBlueprints.map((bp) => [bp.identifier, bp]));
				const teamBlueprint = orgBlueprints.find((bp) => bp.identifier === TEAM_BLUEPRINT_IDENTIFIER);
				const orgBlueprintsWithTeamInheritance: any[] = [];
				const orgBlueprintsWithTeamValues: BlueprintWithCount[] = [];
				const orgBlueprintsWithTeamInheritanceToTeamBlueprint: { blueprint: any; relationIdentifier: string }[] = [];

				for (const blueprint of orgBlueprints) {
					if (blueprint.identifier === TEAM_BLUEPRINT_IDENTIFIER) {
						continue;
					}
					if (blueprint.teamInheritance) {
						const targetBlueprint = getTargetBlueprintByPath(
							blueprint,
							orgBlueprintsByIdentifierMap,
							blueprint.teamInheritance.path.split('.'),
						);
						if (targetBlueprint?.identifier === teamBlueprint?.identifier) {
							const relationIdentifier = blueprint.teamInheritance.path.split('.')[0];
							orgBlueprintsWithTeamInheritanceToTeamBlueprint.push({ blueprint, relationIdentifier });
						} else {
							orgBlueprintsWithTeamInheritance.push(blueprint);
						}
					} else {
						const entitiesWithTeamValuesCount = await countEntitiesWithTeamValues(orgPortClient, blueprint.identifier);
						if (entitiesWithTeamValuesCount > 0) {
							orgBlueprintsWithTeamValues.push({
								blueprint,
								entityCount: entitiesWithTeamValuesCount,
							});
						}
					}
				}

				const teamRelations = findTeamRelations(orgBlueprintsWithTeamInheritanceToTeamBlueprint.map((b) => b.blueprint));

				console.log('Total org blueprints:', colors.cyan(orgBlueprints.length.toString()));
				console.log(
					'Org Blueprints with team inheritance to team blueprint:',
					colors.cyan(orgBlueprintsWithTeamInheritanceToTeamBlueprint.length.toString()),
				);
				console.log('Org Blueprints with team inheritance:', colors.cyan(orgBlueprintsWithTeamInheritance.length.toString()));
				console.log('Org Blueprints with team values:', colors.cyan(orgBlueprintsWithTeamValues.length.toString()));
				const blueprintsToReview = findBlueprintsWithTeamCalculations(orgBlueprints, teamRelations);
				console.log('Found blueprints to review:', colors.cyan(blueprintsToReview.length.toString()));
				console.log('Found team relations:', colors.cyan(teamRelations.length.toString()));

				const orgActions = await getAllActions(orgPortClient);
				const actionsToReview = findActionsWithTeamQuery(orgActions, teamRelations);
				const orgActionsPermissions = await getAllActionsPermissions(orgPortClient, orgActions);
				const actionsPermissionsToReview = findActionsPermissionsWithTeamsValues(orgActionsPermissions, teamRelations);
				console.log('Found actions to review:', colors.cyan(actionsToReview.length.toString()));
				console.log('Found actions permissions to review:', colors.cyan(actionsPermissionsToReview.length.toString()));

				const orgIntegrations = await getAllIntegrations(orgPortClient);
				const integrationsToReview = findIntegrationsWithTeamReference(orgIntegrations, teamRelations);
				console.log('Found integrations to review:', colors.cyan(integrationsToReview.length.toString()));

				const orgWebhooks = await getAllWebhooks(orgPortClient);
				const webhooksToReview = findWebhooksWithTeamMapping(orgWebhooks, teamRelations);
				console.log('Found webhooks to review:', colors.cyan(webhooksToReview.length.toString()));

				const orgPages = await getAllPages(orgPortClient);
				const orgPagesPermissions = await getAllPagesPermissions(orgPortClient, orgPages);
				const pagesToReview = findPagesWithTeamReferences(
					orgPages,
					orgBlueprintsWithTeamInheritanceToTeamBlueprint.map((b) => b.relationIdentifier),
				);
				const pagePermissionsToReview = findPagesWithTeamPermissions(orgPagesPermissions);
				console.log('Found pages to review:', colors.cyan(pagesToReview.length.toString()));
				console.log('Found pages permissions to review:', colors.cyan(pagePermissionsToReview.length.toString()));

				const blueprints = await getAllBlueprints(orgPortClient);
				const blueprintPermissions = await getAllBlueprintPermissions(orgPortClient, blueprints);
				const blueprintPermissionsToReview = findBlueprintPermissionsWithTeamsValues(blueprintPermissions);
				console.log('Found blueprint permissions to migrate:', colors.cyan(blueprintPermissionsToReview.length.toString()));

				console.log('Generating report for org');
				generateReport(
					org,
					orgBlueprintsWithTeamInheritanceToTeamBlueprint,
					orgBlueprintsWithTeamInheritance,
					orgBlueprintsWithTeamValues,
					actionsToReview,
					actionsPermissionsToReview,
					integrationsToReview,
					webhooksToReview,
					pagesToReview,
					pagePermissionsToReview,
					blueprintPermissionsToReview,
					blueprintsToReview
				);
			} catch (error) {
				const errorMessage = 'response' in error ? error.response.data : error;
				console.error('An error occurred:', errorMessage);
			}

		console.log(colors.green('Done'));
	}
};

start();
