const { createClient } = require('redis');

// Migration script to update existing user permits to structured format
async function migrateUserPermits() {
    const redisClient = createClient();
    
    try {
        await redisClient.connect();
        console.log('[Migration] Connected to Redis');
        
        // Get all user IDs
        const userIds = await redisClient.sMembers('user:ids');
        console.log(`[Migration] Found ${userIds.length} users to migrate`);
        
        let migrated = 0;
        let skipped = 0;
        
        for (const uid of userIds) {
            const userDataStr = await redisClient.get(`user:${uid}`);
            if (!userDataStr) {
                console.warn(`[Migration] User ${uid} not found, skipping`);
                continue;
            }
            
            const userData = JSON.parse(userDataStr);
            
            // Check if permit is already structured
            if (typeof userData.permit === 'object' && userData.permit !== null) {
                console.log(`[Migration] User ${userData.name} already has structured permit, skipping`);
                skipped++;
                continue;
            }
            
            // Convert string permit to structured format
            const oldPermit = userData.permit || 'user';
            userData.permit = {
                allow_all: oldPermit === 'admin',
                services: {}
            };
            
            // Save updated user data
            await redisClient.set(`user:${uid}`, JSON.stringify(userData));
            console.log(`[Migration] Updated user ${userData.name}: ${oldPermit} -> ${JSON.stringify(userData.permit)}`);
            migrated++;
        }
        
        console.log(`[Migration] Complete: ${migrated} migrated, ${skipped} skipped`);
        
    } catch (err) {
        console.error('[Migration] Error:', err);
    } finally {
        await redisClient.quit();
    }
}

// Run migration
migrateUserPermits().catch(console.error);
