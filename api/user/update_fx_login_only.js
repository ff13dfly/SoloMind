const { createClient } = require('redis');

async function updateFxPermissions() {
    const redisClient = createClient();
    
    try {
        await redisClient.connect();
        
        // Get fx user ID
        const uid = await redisClient.get('user:name:fx');
        if (!uid) {
            console.error('User fx not found');
            return;
        }
        
        // Get user data
        const userDataStr = await redisClient.get(`user:${uid}`);
        if (!userDataStr) {
            console.error('User data not found');
            return;
        }
        
        const userData = JSON.parse(userDataStr);
        console.log('Current permit:', JSON.stringify(userData.permit));
        
        // Update permit to specified login methods only
        userData.permit = {
            allow_all: false,
            services: {
                'user': ['login_request', 'login_verify']
            }
        };
        
        // Save updated user data
        await redisClient.set(`user:${uid}`, JSON.stringify(userData));
        console.log('Updated permit:', JSON.stringify(userData.permit));
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await redisClient.quit();
    }
}

updateFxPermissions();
