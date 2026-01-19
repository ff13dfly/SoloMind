
const redis = require('redis');

async function run() {
    const client = redis.createClient();
    
    client.on('error', (err) => console.error('Redis Client Error', err));
    
    await client.connect();
    
    const PATTERN = 'ORCHESTRATOR:WORKFLOW:*';
    console.log(`Scanning for workflows with pattern: ${PATTERN}`);
    
    const keys = await client.keys(PATTERN);
    console.log(`Found ${keys.length} workflows.`);
    
    for (const key of keys) {
        try {
            // Read current value
            const currentCat = await client.json.get(key, { path: '$.category' });
            
            // If it's already an empty object, skip
            if (currentCat && typeof currentCat === 'object' && !Array.isArray(currentCat) && Object.keys(currentCat).length === 0) {
                // console.log(`[SKIP] ${key} is already {}`);
                continue;
            }

            console.log(`[UPDATE] ${key}: "${JSON.stringify(currentCat)}" -> {}`);
            
            // Set category to empty object
            await client.json.set(key, '$.category', {});
            
        } catch (err) {
            console.error(`[ERROR] Processing ${key}:`, err.message);
        }
    }
    
    console.log('Migration complete.');
    await client.disconnect();
}

run().catch(console.error);
