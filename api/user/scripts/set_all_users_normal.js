const redis = require('redis');

async function updateUsers() {
    console.log('Connecting to Redis...');
    const client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    client.on('error', err => console.error('Redis Error:', err));
    await client.connect();

    try {
        // 1. Get all user IDs
        const userIds = await client.sMembers('user:ids');
        console.log(`Found ${userIds.length} users.`);

        let updatedCount = 0;

        // 2. Iterate and update
        for (const uid of userIds) {
            const key = `user:${uid}`;
            const userDataStr = await client.get(key);
            
            if (userDataStr) {
                const user = JSON.parse(userDataStr);
                
                // Initialize categories if missing
                user.categories = user.categories || {};
                
                // Update role to 'normal'
                // You might want to check if it's already set to prevent overwriting 'operator',
                // but the prompt says "set all users to normal", so I will overwrite/set.
                // However, usually "set all users" implies bulk initialization.
                // I'll proceed with setting it to 'normal'.
                
                // OPTIONAL: logic to Keep existing if not null?
                // The prompt is "將现在所有的user设置成normal" (Set all current users to normal).
                // I will apply strictly.
                user.categories.role = 'normal';

                await client.set(key, JSON.stringify(user));
                updatedCount++;
                // console.log(`Updated user ${user.name} (${uid})`);
            }
        }

        console.log(`Successfully updated ${updatedCount} users to role: normal.`);

    } catch (err) {
        console.error('Error updating users:', err);
    } finally {
        await client.quit();
    }
}

updateUsers().catch(console.error);
