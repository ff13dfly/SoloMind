
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
            const workflow = await client.json.get(key);
            if (!workflow) continue;
            
            let modified = false;
            
            // 1. Convert category from string to object { "TYPE": value }
            if (typeof workflow.category === 'string') {
                const oldCat = workflow.category;
                workflow.category = { "TYPE": oldCat };
                console.log(`[UPDATE] ${key}: category "${oldCat}" -> ${JSON.stringify(workflow.category)}`);
                modified = true;
            }
            
            // 2. Remove defaults field if exists
            if (workflow.defaults !== undefined) {
                delete workflow.defaults;
                console.log(`[UPDATE] ${key}: removed defaults field`);
                modified = true;
            }
            
            // 3. Ensure required_inputs and optional_inputs exist
            if (!workflow.required_inputs) {
                workflow.required_inputs = [];
                modified = true;
            }
            if (!workflow.optional_inputs) {
                workflow.optional_inputs = [];
                modified = true;
            }
            
            if (modified) {
                await client.json.set(key, '$', workflow);
            }
            
        } catch (err) {
            console.error(`[ERROR] Processing ${key}:`, err.message);
        }
    }
    
    console.log('Migration complete.');
    await client.disconnect();
}

run().catch(console.error);
