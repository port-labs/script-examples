import axios from 'axios';
import jwtDecode from 'jwt-decode';

import { CtorParams, RequestParams } from './types';

const MIN_TOKEN_TTL = 5000;

export default class Client {
	private readonly url: CtorParams['url'];

	private readonly parseError: CtorParams['parseError'];

	private token: CtorParams['auth']['token'];

	private readonly clientId: CtorParams['auth']['clientId'];

	private readonly clientSecret: CtorParams['auth']['clientSecret'];

	constructor({ url, parseError, auth }: CtorParams) {
		this.url = url;
		this.parseError = parseError;
		if (auth.token) {
			this.token = auth.token;
		} else {
			this.clientId = auth.clientId;
			this.clientSecret = auth.clientSecret;
		}
	}

	private async getToken() {
		if (this.token) {
			const parsedToken = jwtDecode<any>(this.token);
			const expDate = new Date(parsedToken.exp * 1000);
			const diff = expDate.getTime() - new Date().getTime();

			if (diff > MIN_TOKEN_TTL) {
				return this.token;
			}
		}

		try {
			const { data } = await axios.post(`${this.url}/v1/auth/access_token`, {
				clientId: this.clientId,
				clientSecret: this.clientSecret,
			});

			this.token = data.accessToken;

			return this.token;
		} catch (e: any) {
			const message = e?.response?.data?.error || e.message;
			throw this.parseError ? this.parseError(e) : e;
		}
	}

	protected async request(requestParams: RequestParams) {
		const { pathname, method, query, body, headers } = requestParams;
		const queryString = Object.entries(query || {})
			.filter(([, v]) => v !== undefined && v !== null)
			.map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(`&${k}=`) : v}`)
			.join('&');

		const completeUrl = `${this.url}${pathname}${queryString ? `?${queryString}` : ''}`;

		try {

			const { data } = await axios({
				method,
				url: completeUrl,
				headers: {
					Authorization: `Bearer ${await this.getToken()}`,
					...headers,
				},
				...(body ? { data: body } : undefined),
			});

			return data;
		} catch (e: any) {
			const statusCode = e?.response?.status || e?.code;
			const error = e?.response?.data?.message || e.message;
			throw this.parseError ? this.parseError(e, requestParams) : e;
		}
	}
}
