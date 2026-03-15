export interface Config {
	REGION: 'eu' | 'us';
	CLIENT_ID: string;
	CLIENT_SECRET: string;
}

export type ScriptOrg = {
	id: string;
	name: string;
	featureFlags?: string[];
};

export type CalculationPropertyFinding = {
	blueprintIdentifier: string;
	blueprintTitle: string;
	propertyIdentifier: string;
	calculation: string;
	reason: string;
};
