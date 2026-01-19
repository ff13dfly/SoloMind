const redis = require('redis');
const chalk = require('chalk');
const config = require('../config');

async function initializeRedis(SERVICE_NAME) {
    const redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => console.log(chalk.red(`[${SERVICE_NAME}] Redis Client Error`), err));
    
    await redisClient.connect();
    console.log(chalk.green(`[${SERVICE_NAME}] Redis connected`));
    
    return redisClient;
}

async function ensureDefaultCategories(redisClient) {
    if (!config.seeds || !config.seeds.categories) return;

    for (const cat of config.seeds.categories) {
        const key = `USER:CONFIG:CATEGORY:${cat.key}`; // Upper case per protocol
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
