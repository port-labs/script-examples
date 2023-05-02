const axios = require('axios');

// Define an array of pages titles to match
const titlesToMatch = [
    'Page1',
    'Page 2',
    'Page 3'
];

// Define the base URL for the API
const API_BASE_URL = 'https://api.getport.io/';

// Define the route for fetching organization
const ORGANIZATION_ROUTE = '/v1/organization';

// Define the authorization bearer token
const AUTH_TOKEN = 'YOUR BEARER TOKEN HERE';

// Fetch the existing organization
axios
   .get(API_BASE_URL + ORGANIZATION_ROUTE, {
       headers: {
           'Content-Type': 'application/json',
           Authorization: `Bearer ${AUTH_TOKEN}`,
       },
   })
   .then((response) => {
       // Get the organization data
       const { organization } = response.data;

       // Sort the pages by the order of the titlesToMatch array
       const organizationWithPagesSorted = organization.pageOrder.sort((pageA, pageB) => {
           return titlesToMatch.reverse().includes(pageA) ? -1 : 0;
       });

       const orgToUpdate = {
           ...organization,
           pageOrder: organizationWithPagesSorted,
       };
       delete orgToUpdate.id;
       orgToUpdate.defaultPage = orgToUpdate.defaultPage ?? titlesToMatch[0];

       // Send a PUT request to update the organization
       axios
         .put(API_BASE_URL + ORGANIZATION_ROUTE, JSON.stringify(orgToUpdate), {
             headers: {
                 'Content-Type': 'application/json',
                 Authorization: `Bearer ${AUTH_TOKEN}`,
             },
         })
         .then((response) => {
             console.log(`organization page order updated successfully`);
         })
         .catch((error) => {
             console.error(`Error updating org: ${error.message}`);
         });
   })
   .catch((error) => {
       console.error(error);
   });