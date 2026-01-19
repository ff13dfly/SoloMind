/**
 * Bootstrap Handler
 * Redis initialization and service registry loading
 */

const { createClient } = require('redis');

let redisClient = null;

/**
 * Initialize Redis connection and load services
 * @param {object} SERVICES - Services registry to populate
 * @param {function} updateCapabilityMap - Capability map update function
 * @returns {Promise<object>} Redis client
 */
async function initializeRedis(SERVICES, updateCapabilityMap) {
    try {
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        redisClient.on('error', err => console.error('[Router] Redis Client Error', err));
        await redisClient.connect();
        console.log('[Router] Connected to Redis');

        // Load services from Redis
        const storedServices = await redisClient.get('active_services');
        if (storedServices) {
            Object.assign(SERVICES, JSON.parse(storedServices));
            console.log('[Router] Services loaded from Redis');
        } else {
            console.log('[Router] No services found in Redis. Registry empty.');
        }
        
        // Initial capability map update and periodic refresh
        if (updateCapabilityMap) {
            setTimeout(updateCapabilityMap, 2000);
            setInterval(updateCapabilityMap, 60000);
        }

        return redisClient;
    } catch (err) {
        console.error('[Router] Redis initialization failed:', err);
        return null;
    }
}

/**
 * Get Redis client instance
 * @returns {object|null}
 */
function getRedisClient() {
    return redisClient;
}

/**
 * Set Redis client (for external initialization)
 * @param {object} client
 */
function setRedisClient(client) {
    redisClient = client;
}

module.exports = {
    initializeRedis,
    getRedisClient,
    setRedisClient
};
