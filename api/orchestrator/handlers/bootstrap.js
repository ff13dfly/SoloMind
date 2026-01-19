const redis = require('redis');
const chalk = require('chalk');
const config = require('../config');

async function persistSemanticDescription(redisClient, SERVICE_NAME) {
    try {
        const key = `SYSTEM:SEMANTIC:${SERVICE_NAME}`;
        const payload = { source: 'config', ...config.description };
        await redisClient.json.set(key, '$', payload);
        console.log(chalk.green(`[${SERVICE_NAME}] Semantic description persisted`));
    } catch (e) {
        console.error(chalk.red(`[${SERVICE_NAME}] Failed to persist semantic:`, e.message));
    }
}

async function initializeRedis(SERVICE_NAME) {
    const redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => console.log(chalk.red(`[${SERVICE_NAME}] Redis Client Error`), err));
    
    await redisClient.connect();
    console.log(chalk.green(`[${SERVICE_NAME}] Redis connected`));
    
    await persistSemanticDescription(redisClient, SERVICE_NAME);
    
    return redisClient;
}


async function ensureDefaultCategories(redisClient, SERVICE_NAME) {
    if (!config.seeds || !config.seeds.categories) return;

    for (const cat of config.seeds.categories) {
        // Orchestrator Specific: Service Name is usually 'ORCHESTRATOR'
        const key = `${SERVICE_NAME.toUpperCase()}:CONFIG:CATEGORY:${cat.key}`; 
        const exists = await redisClient.exists(key);
        
        if (!exists) {
            console.log(chalk.yellow(`[Bootstrap] Seed: "${cat.key}" category missing. Creating defaults...`));
            const now = Date.now();
            
            // Enrich items with timestamps/defaults if missing
            const items = (cat.items || []).map(item => ({
                id: item.id,
                label: item.label,
                desc: item.desc || '',
                parentId: item.parentId || null,
                createdAt: now
            }));

            const categoryData = {
                key: cat.key,
                type: cat.type || 'LIST',
                scope: cat.scope || 'LOCAL',
                desc: cat.desc || '',
                status: cat.status || 'ACTIVE',
                createdAt: now,
                updatedAt: now,
                items: items
            };

            await redisClient.set(key, JSON.stringify(categoryData));
            console.log(chalk.green(`[Bootstrap] Seed: "${cat.key}" category created.`));
        }
    }
}

module.exports = { initializeRedis, ensureDefaultCategories };
