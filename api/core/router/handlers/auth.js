/**
 * Authentication & Permission Handlers
 * Handles session resolution, permission checking, and admin verification
 */

/**
 * Resolve session user from token
 * @param {string} token - Auth token from headers
 * @param {object} redisClient - Redis client instance
 * @returns {Promise<object>} Session user with normalized permit
 */
async function resolveSessionUser(token, redisClient) {
    let sessionUser = { username: 'guest', permit: { allow_all: false, services: {} } };
    
    if (!token || !redisClient || !redisClient.isOpen) {
        return sessionUser;
    }
    
    const sessionStr = await redisClient.get(`session:${token}`);
    if (!sessionStr) {
        return sessionUser;
    }
    
    const session = JSON.parse(sessionStr);
    sessionUser = session;
    
    // Legacy/Fallback normalization
    if (!sessionUser.permit) {
        if (sessionUser.role === 'admin') {
            sessionUser.permit = { allow_all: true, services: {} };
        } else {
            sessionUser.permit = { allow_all: false, services: {} };
        }
    } else if (typeof sessionUser.permit === 'string') {
        if (sessionUser.permit === 'admin') {
            sessionUser.permit = { allow_all: true, services: {} };
        } else {
            sessionUser.permit = { allow_all: false, services: {} };
        }
    }
    
    return sessionUser;
}

/**
 * Extract token from request headers
 * @param {object} req - Express request object
 * @returns {string|null} Token string or null
 */
function extractToken(req) {
    return req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-admin-token'] || null;
}

/**
 * Check if user is admin
 * @param {object} sessionUser - Session user object
 * @returns {boolean} True if admin
 */
function isAdmin(sessionUser) {
    return sessionUser?.permit?.allow_all === true;
}

/**
 * Check permission for specific service/method
 * @param {object} permit - User permit object
 * @param {string} service - Target service name
 * @param {string} method - Method name
 * @returns {boolean} True if allowed
 */
function checkPermission(permit, service, method) {
    if (!permit) return false;
    if (permit.allow_all) return true;
    if (!permit.services) return false;
    
    const allowedMethods = permit.services[service];
    if (!allowedMethods) return false;
    
    if (allowedMethods.includes('*')) return true;
    if (allowedMethods.includes(method)) return true;
    
    return false;
}

/**
 * Find target service for a method
 * @param {string} method - RPC method name
 * @param {object} SERVICES - Services registry
 * @returns {object|null} { service, serviceName, methodSchema } or null
 */
function resolveTargetService(method, SERVICES) {
    for (const [name, svc] of Object.entries(SERVICES)) {
        const foundMethod = svc.methods && svc.methods.find(m => m.name === method);
        if (foundMethod) {
            return {
                service: svc,
                serviceName: name,
                methodSchema: foundMethod.params
            };
        }
    }
    return null;
}

module.exports = {
    resolveSessionUser,
    extractToken,
    isAdmin,
    checkPermission,
    resolveTargetService
};
