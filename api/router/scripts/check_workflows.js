
const redis = require('redis');

async function run() {
    const client = redis.createClient();
    await client.connect();
    
    console.log('Checking ORCHESTRATOR:WORKFLOW:* keys...');
    const keys = await client.keys('ORCHESTRATOR:WORKFLOW:*');
    console.log(`Found ${keys.length} keys:`, keys);
    
    if (keys.length > 0) {
        // Sample first workflow
        const sample = await client.json.get(keys[0]);
        console.log('\nSample workflow:', JSON.stringify(sample, null, 2));
    }
    
    await client.disconnect();
}

run().catch(console.error);
