import fs from 'fs';
import path from 'path';
import process from 'process';
import colors from 'colors/safe';

import { Config } from './src/types';
import { findCalculationPropertiesWithBreakingChanges } from './src/utils/blueprintUtils';
import { getAllBlueprints, getOrg, getPortApiClient } from './src/utils/portApiUtils';
import { generateReport } from './src/utils/reportUtils';

const FEATURE_FLAG = 'SKIP_CALCULATION_PROPERTIES_ON_ENTITIES_SEARCH';

function loadConfig(): Config | undefined {
	const configPath = path.join(process.cwd(), 'config.json');

	try {
		if (!fs.existsSync(configPath)) {
			throw new Error('Config file not found. Please create a config.json file based on config.example.json');
		}

		const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

		if (!config.CLIENT_ID || !config.CLIENT_SECRET) {
			throw new Error('Missing required fields in config.json');
		}

		if (config.REGION && config.REGION !== 'eu' && config.REGION !== 'us') {
			throw new Error('REGION must be either "eu" or "us"');
		}

		return { ...config, REGION: config.REGION || 'eu' };
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
	if (!config) return;

	const { REGION, CLIENT_ID, CLIENT_SECRET } = config;
	const redactedClientId = CLIENT_ID.slice(0, 6) + '...' + CLIENT_ID.slice(-4);
	console.log(colors.green(`Starting persistent calculation properties visibility script with client id of - ${redactedClientId}`));

	try {
		const portClient = getPortApiClient(REGION, CLIENT_ID, CLIENT_SECRET);
		const org = await getOrg(portClient);
		console.log(`Org: ${colors.cyan(org.name)}`);

		const alreadyEnabled = Array.isArray(org.featureFlags) && org.featureFlags.includes(FEATURE_FLAG);

		if (alreadyEnabled) {
			console.log(colors.yellow('Organization already has persistent calculation properties enabled.'));
			generateReport(org, [], 0, 0, true);
			console.log(colors.green('Report generated at output/index.html'));
			console.log(colors.green('Done'));
			return;
		}

		const blueprints = await getAllBlueprints(portClient);
		console.log('Total org blueprints:', colors.cyan(blueprints.length.toString()));

		let totalCalculationProperties = 0;
		for (const bp of blueprints) {
			if (bp.calculationProperties) {
				totalCalculationProperties += Object.keys(bp.calculationProperties).length;
			}
		}
		console.log('Total calculation properties:', colors.cyan(totalCalculationProperties.toString()));

		const findings = findCalculationPropertiesWithBreakingChanges(blueprints);
		console.log('Calculation properties requiring review:', colors.cyan(findings.length.toString()));

		generateReport(org, findings, blueprints.length, totalCalculationProperties, false);
		console.log(colors.green('Report generated at output/index.html'));
	} catch (error: any) {
		const errorMessage = error.response ? error.response.data : error;
		console.error('An error occurred:', errorMessage);
	}

	console.log(colors.green('Done'));
};

start();
