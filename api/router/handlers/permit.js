/**
 * Permission Enforcement Handler
 * Centralized permission checking with public method whitelist support
 */

const authHandlers = require('./auth');
const { isPublicMethod } = require('./validator');

/**
 * Check if user has permission to call a method
 * @param {object} sessionUser - Session user object
 * @param {string} targetServiceName - Target service name
 * @param {string} method - Method name
 * @returns {object} { allowed: boolean, reason?: string }
 */
function checkAccess(sessionUser, targetServiceName, method) {
    // No service name means system method, pass through
    if (!targetServiceName) {
        return { allowed: true };
    }

    console.log(`[Router] Checking permission for ${sessionUser.username} to call ${method} on service ${targetServiceName}`);

    // Check permit first
    if (authHandlers.checkPermission(sessionUser.permit, targetServiceName, method)) {
        console.log(`[Router] checkPermission returned true, access granted`);
        return { allowed: true };
    }

    console.log(`[Router] checkPermission returned false, checking PUBLIC_METHODS whitelist`);

    // Check public methods whitelist (Dynamic + Static)
    if (isPublicMethod(method)) {
        console.log(`[Router] ${method} is whitelisted as STATIC PUBLIC, allowing access`);
        return { allowed: true };
    }

    // Check Dynamic Public Flag from Capability Map
    const capabilityHandler = require('./capability');
    const capMap = capabilityHandler.getCapabilityMap();
    if (capMap[method] && capMap[method].public) {
        console.log(`[Router] ${method} is flagged as DYNAMIC PUBLIC, allowing access`);
        return { allowed: true };
    }

    console.warn(`[Router] Access Denied for ${sessionUser.username} to ${method}`);
    return { 
        allowed: false, 
        reason: 'Forbidden',
        errorCode: -32604
    };
}

/**
 * Create permission denied JSON-RPC error response
 * @param {number|string} id - Request ID
 * @returns {object} JSON-RPC error response
 */
function createForbiddenError(id) {
    return { 
        jsonrpc: '2.0', 
        error: { code: -32604, message: 'Forbidden' }, 
        id 
    };
}

module.exports = {
    checkAccess,
    createForbiddenError
};
