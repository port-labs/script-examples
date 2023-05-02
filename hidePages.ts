const axios = require('axios');

// --------------------- CHANGE THIS VARIABLE TO FALSE IF YOU WANT TO HIDE THE PAGES IN THE ARRAY -----------------------
const SHOW_IN_SIDE_BAR = true;

// Define an array of pages titles to match
const titlesToMatch = [
	'Page1',
	'Page2',
	'Page3'

// Define the base URL for the API
const API_BASE_URL = 'https://api.getport.io/';

// Define the route for fetching pages
const PAGES_ROUTE = '/v1/pages';

// Define the authorization bearer token
const AUTH_TOKEN = 'YOUR BEARER TOKEN HERE';

axios
	.get(`${API_BASE_URL}${PAGES_ROUTE}?compact=false`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${AUTH_TOKEN}`,
		},
	})
	.then((response) => {
		response.data.pages.forEach((page) => {
			if (titlesToMatch.includes(page.title)) {
				axios
					.put(
						`${API_BASE_URL}${PAGES_ROUTE}/${page.identifier}`,
						JSON.stringify({
							...page,
							showInSidebar: SHOW_IN_SIDE_BAR,
						}),
						{
							headers: {
								'Content-Type': 'application/json',
								Authorization: `Bearer ${AUTH_TOKEN}`,
							},
						},
					)
					.then(() => {
						console.log(`Page ${page.identifier} updated successfully`);
					})
					.catch((error) => {
						console.error(`Error updating page ${page.identifier}: ${error.message}`);
					});
			}
		});
	})
	.catch((error) => {
		console.error(`Error fetching pages: ${error.message}`);
	});