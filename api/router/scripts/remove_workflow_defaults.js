
const redis = require('redis');

async function run() {
    const client = redis.createClient();
    await client.connect();
    
    const PATTERN = 'ORCHESTRATOR:WORKFLOW:*';
    console.log(`Scanning for workflows with pattern: ${PATTERN}`);
    
    const keys = await client.keys(PATTERN);
    console.log(`Found ${keys.length} workflows.`);
    
    for (const key of keys) {
        try {
            // Check if defaults field exists
            const hasDefaults = await client.json.get(key, { path: '$.defaults' });
            
            if (hasDefaults !== null && hasDefaults !== undefined) {
                console.log(`[UPDATE] Removing defaults from: ${key}`);
                await client.json.del(key, '$.defaults');
            }
        } catch (err) {
            console.error(`[ERROR] Processing ${key}:`, err.message);
        }
    }
    
    console.log('Migration complete.');
    await client.disconnect();
}

run().catch(console.error);
