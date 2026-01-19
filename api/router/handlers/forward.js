/**
 * RPC Forward Handler
 * Handles request signing, forwarding to target services, and response processing
 */

const axios = require('axios');
const tweetnacl = require('tweetnacl');
const bs58 = require('bs58').default || require('bs58');

/**
 * Sign and forward RPC request to target service
 * @param {object} options - Forward options
 * @returns {Promise<object>} Service response data
 */
async function forwardRequest({
    targetService,
    method,
    params,
    jsonrpc,
    id,
    sessionUser,
    isAdmin,
    keypair,
    debug,
    sourceHeaders = {}
}) {
    console.log(`[Router] Forwarding RPC to ${targetService.url}. Method: ${method}, User: ${sessionUser.username}`);
    
    // Sign request
    const authPayload = {
        iss: 'router',
        iat: Date.now(),
        user: sessionUser.username,
        permit: isAdmin ? 'admin' : 'user'
    };
    const payloadStr = JSON.stringify(authPayload);
    const payloadBytes = new TextEncoder().encode(payloadStr);
    const signature = tweetnacl.sign.detached(payloadBytes, keypair.secretKey);
    
    const headers = {
        'Content-Type': 'application/json',
        'X-Router-Token': bs58.encode(Buffer.from(payloadStr)),
        'X-Router-Signature': bs58.encode(signature)
    };

    // Passthrough Auth Headers
    if (sourceHeaders['authorization']) headers['authorization'] = sourceHeaders['authorization'];
    if (sourceHeaders['x-admin-token']) headers['x-admin-token'] = sourceHeaders['x-admin-token'];

    const enrichedBody = {
        jsonrpc,
        method,
        params,
        id
    };

    if (debug) {
        console.log(`[Router] Enriched Payload:`, JSON.stringify(enrichedBody, null, 2));
    }
    
    const serviceRes = await axios.post(targetService.url, enrichedBody, { headers });
    
    console.log(`[Router] Response from ${targetService.url}:`, JSON.stringify(serviceRes.data, null, 2));
    
    return serviceRes.data;
}

/**
 * Extract and detach tasks from response
 * @param {object} responseData - Service response data  
 * @returns {Array|null} Extracted tasks or null
 */
function extractTasks(responseData) {
    if (responseData && responseData.result && responseData.result._tasks) {
        const tasks = responseData.result._tasks;
        delete responseData.result._tasks;
        return tasks;
    }
    return null;
}

/**
 * Log upstream error to Redis
 * @param {Error} err - Error object
 * @param {object} params - Request params
 * @param {object} redisClient - Redis client
 */
async function logUpstreamError(err, params, redisClient) {
    const errorLog = {
        code: 'UPSTREAM_ERROR',
        error: err.message,
        request: params,
        stamp: new Date().toISOString()
    };
    try {
        if (redisClient && redisClient.isOpen) {
            await redisClient.rPush('ERROR:QUEUE:router', JSON.stringify(errorLog));
        }
    } catch (e) {
        console.error('Log failed', e);
    }
}

/**
 * Create error response for upstream failures
 * @param {string} errMessage - Error message
 * @param {number|string} id - Request ID
 * @returns {object} JSON-RPC error response
 */
function createUpstreamError(errMessage, id) {
    return { 
        jsonrpc: '2.0', 
        error: { code: -32603, message: 'Upstream Service Error', data: errMessage }, 
        id 
    };
}

module.exports = {
    forwardRequest,
    extractTasks,
    logUpstreamError,
    createUpstreamError
};
