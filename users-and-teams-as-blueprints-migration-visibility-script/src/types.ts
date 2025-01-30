export type Env = 'local' | 'staging' | 'production' | 'us';
export type ScriptOrg = Required<Pick<any, 'id' | 'name'>> & Partial<Omit<any, 'id' | 'name'>>;

export type BlueprintWithCount = {
	blueprint: any;
	entityCount: number;
};

export type BlueprintPermissionsWithBlueprint = {
	blueprint: any;
	permissions: any;
	reviewReason?: string;
};

export type JQQuery = {
	jqQuery: string;
};

export type TeamRelationReference = {
	blueprintIdentifier: string;
	relationIdentifier: string;
};

export type ActionWithJQLocation = {
	action: any;
	jqQueryPath: string[];
};

export type ActionPermissionReviewReason = string;

export type ActionPermissionsWithAction = {
	action: any;
	permissions: any;
	reviewReason: ActionPermissionReviewReason | null;
};

export type IntegrationReviewReason =
	| 'Team mapping in entity configuration'
	| 'GitOps file needs to be reviewed'
	| 'Contains team references that need to be updated after migration';

export type IntegrationWithLocation = {
	integration: any;
	teamReferencePaths: string[];
	reviewReason: IntegrationReviewReason;
};

export type WebhookReviewReason =
	| 'Team mapping in entity configuration'
	| 'Contains team references that need to be updated after migration';

export type WebhookWithLocation = {
	webhook: any;
	teamReferencePaths: string[];
	reviewReason: WebhookReviewReason;
};

export type PageWithLocation = {
	page: any;
	widgetId: string;
	widgetTitle?: string;
	blueprintIdentifier: string;
	relationReferences: string[];
};

export type PagePermissionsWithPage = {
	page: any;
	permissions: any;
	reviewReason?: string;
};

export type PagePermissionsReviewReason = 'Explicit teams in page permissions';

export interface Config {
	REGION: 'eu' | 'us';
	CLIENT_ID: string;
	CLIENT_SECRET: string;
}