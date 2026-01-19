const Redis = require('ioredis');
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
});

async function migrate() {
    const key = 'USER:CONFIG:CATEGORY:role';
    const newKey = 'USER:CONFIG:CATEGORY:ROLE';
    
    console.log('Checking', key);
    const dataStr = await redis.get(key);
    
    if (!dataStr) {
        console.log('No legacy role key found.');
        process.exit(0);
    }
    
    let data;
    try {
        data = JSON.parse(dataStr);
    } catch (e) {
        console.error('Failed to parse JSON');
        process.exit(1);
    }
    
    if (Array.isArray(data)) {
        console.log('Found legacy array format. Migrating...');
        
        const newData = {
            key: 'ROLE',
            type: 'LIST',
            scope: 'LOCAL',
            desc: 'User System Roles',
            items: data,
            status: 'ACTIVE',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        await redis.set(newKey, JSON.stringify(newData));
        console.log(`Saved new format to ${newKey}`);
        
        // Optional: Delete old key or leave it?
        // Better to delete to avoid confusion, but maybe rename for backup?
        await redis.rename(key, key + '_backup_legacy');
        console.log(`Renamed old key to ${key}_backup_legacy`);
        
    } else {
        console.log('Data is not an array. Already migrated or different format?');
        console.log(data);
    }
    
    redis.disconnect();
}

migrate().catch(console.error);
