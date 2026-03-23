type UnionKeys<T> = T extends T ? keyof T : never;
type StrictUnionHelper<T, TAll> = T extends any ? T & Partial<Record<Exclude<UnionKeys<TAll>, keyof T>, undefined>> : never;
export type StrictUnion<T> = StrictUnionHelper<T, T>;

export type RequestParams = {
	pathname: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	query?: Record<string, string | boolean | string[] | undefined>;
	body?: object;
	headers?: object;
};

export type CtorParams = {
	url: string;
	parseError?: (e: Error, requestParams?: RequestParams) => Error;
	auth: StrictUnion<{ token: string } | { clientId: string; clientSecret: string }>;
};
