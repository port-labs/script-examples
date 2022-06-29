const axios = require('axios');

const CLIENT_ID = '***';
const CLIENT_SECRET = '***';

const API_URL = 'https://api.getport.io';

(async () => {
    console.log('Obtaining access token...');

    let response = await axios.get(`${API_URL}/v0.1/auth/access_token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`);
    const token = response.data.accessToken;

    console.log('Fetching all Deployment entities...');

    response = await axios.post(
        `${API_URL}/v0.1/entities/search`,
        {
            combinator: "and",
            rules: [
                {
                    property: "$blueprint",
                    operator: "=",
                    value: "Deployment"
                }
            ]
        },
        {
            headers: {
                Authorization: `bearer ${token}`
            }
        }
    );

    for (let entity of response.data.entities) {
        if (!entity.properties.date.includes('UTC')) {
         console.log(`Entity ${entity.identifier} has valid date format -> skipping`);
         continue;
        }

        let newDate = entity.properties.date;

        try {
            newDate = (new Date(entity.properties.date)).toISOString();
        } catch (e) {
            console.log(`Entity ${entity.identifier} has invalid date field -> skipping`);
            continue;
        }

        console.log(`Updating date field for entity ${entity.identifier}`);

        try {
            await axios.patch(
                `${API_URL}/v0.1/entities/${entity.identifier}`,
                {
                    properties: {
                        date: newDate
                    }
                },
                {
                    headers: {
                        Authorization: `bearer ${token}`
                    }
                }
            );
        } catch (e) {
            console.error(e);
        }
    }

    console.log('Done :)')

    process.exit(0);
})()