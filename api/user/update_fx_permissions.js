const { createClient } = require('redis');

// Script to update fx user's permissions
async function updateFxPermissions() {
    const redisClient = createClient();
    
    try {
        await redisClient.connect();
        console.log('[Update] Connected to Redis');
        
        // Get fx user ID
        const uid = await redisClient.get('user:name:fx');
        if (!uid) {
            console.error('[Update] User fx not found');
            return;
        }
        
        console.log(`[Update] Found user fx with UID: ${uid}`);
        
        // Get user data
        const userDataStr = await redisClient.get(`user:${uid}`);
        if (!userDataStr) {
            console.error('[Update] User data not found');
            return;
        }
        
        const userData = JSON.parse(userDataStr);
        console.log('[Update] Current permit:', JSON.stringify(userData.permit));
        
        // Update permit to allow user service methods
        userData.permit = {
            allow_all: false,
            services: {
                'user': ['*']  // Allow all user service methods
            }
        };
        
        // Save updated user data
        await redisClient.set(`user:${uid}`, JSON.stringify(userData));
        console.log('[Update] Updated permit:', JSON.stringify(userData.permit));
        console.log('[Update] User fx permissions updated successfully!');
        
    } catch (err) {
        console.error('[Update] Error:', err);
    } finally {
        await redisClient.quit();
    }
}

// Run update
updateFxPermissions().catch(console.error);
