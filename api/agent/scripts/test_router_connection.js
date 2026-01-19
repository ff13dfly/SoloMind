const axios = require('axios');
const config = require('./config');

(async () => {
    console.log('Testing connection to Router at:', config.routerUrl);
    try {
        const res = await axios.post(`${config.routerUrl}/api/rpc`, {
            jsonrpc: '2.0',
            method: 'system.capabilities',
            id: 1
        });
        console.log('Capabilities fetched successfully:', Object.keys(res.data.result || {}).length, 'items');
        console.log('Sample:', JSON.stringify(res.data.result['finance.create'] || {}, null, 2));
    } catch (e) {
        console.error('Connection failed:', e.message);
    }
})();
