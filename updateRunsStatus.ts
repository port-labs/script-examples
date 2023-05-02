const axios = require('axios');

const PORT_HOST = 'https://api.getport.io/v1';
const headers = {
	Authorization: `{TOKEN}`,
};

(async () => {
	const runsResponse = await axios.get(`${PORT_HOST}/actions/runs?active=true`, { headers });
	console.log(`${runsResponse.data.runs.length} to update`);
	await Promise.all(runsResponse.data.runs.map(async (run) => {
		console.log(`Updating ${run.id}`);
		return await axios.patch(`${PORT_HOST}/actions/runs/${run.id}`, { status: 'SUCCESS' }, { headers });
	}));


    process.exit(0);
})();