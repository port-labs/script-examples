const axios = require('axios');

const CLIENT_ID = '***';
const CLIENT_SECRET = '***';

const API_URL = 'https://api.getport.io';

(async () => {
    console.log('Obtaining access token...');

    let response = await axios.get(`${API_URL}/v0.1/auth/access_token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`);
    const token = response.data.accessToken;

    console.log('Fetching org settings...');

    response = await axios.get(
        `${API_URL}/v0.1/organization`,
        {
            headers: {
                Authorization: `bearer ${token}`
            }
        }
    );

    const newOrgSettings = response.data.organization;

    console.log(`Sorting page order ASC`);

    newOrgSettings.pageOrder = newOrgSettings.pageOrder.sort();

    console.log(`Updating new page order`);

    await axios.put(
        `${API_URL}/v0.1/organization`,
        newOrgSettings,
        {
            headers: {
                Authorization: `bearer ${token}`
            }
        }
    );

    console.log('Done :)')

    process.exit(0);
})()