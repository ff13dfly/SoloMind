/**
 * Task Processing Handler
 * Handles background task execution with security allowlist
 */

const axios = require('axios');
const tweetnacl = require('tweetnacl');
const bs58 = require('bs58').default || require('bs58');

// Security: Allowlist for task execution
const ALLOWED_SERVICES = ['gateway', 'notification', 'log'];

/**
 * Process background tasks
 * @param {Array} tasks - Array of task objects
 * @param {string} username - Username for context
 * @param {boolean} isAdmin - Admin status
 * @param {object} SERVICES - Service registry
 * @param {object} keypair - Router keypair for signing
 * @param {object} redisClient - Redis client for error logging
 */
async function processTasks(tasks, username, isAdmin, SERVICES, keypair, redisClient) {
    console.log(`[Router] Processing ${tasks.length} background tasks...`);

    for (const task of tasks) {
        try {
            const { service, method, params } = task;
            
            if (!ALLOWED_SERVICES.includes(service)) {
                console.warn(`[Router] BLOCKED task for forbidden service: ${service}`);
                continue;
            }

            const targetSvc = SERVICES[service];
            if (!targetSvc) {
                console.warn(`[Router] Task target service not found: ${service}`);
                continue;
            }

            const authPayload = {
                iss: 'router',
                iat: Date.now(),
                user: username,
                permit: isAdmin ? 'admin' : 'user',
                context: 'task'
            };
            const payloadStr = JSON.stringify(authPayload);
            const payloadBytes = new TextEncoder().encode(payloadStr);
            const signature = tweetnacl.sign.detached(payloadBytes, keypair.secretKey);

            const headers = {
                'Content-Type': 'application/json',
                'X-Router-Token': bs58.encode(Buffer.from(payloadStr)),
                'X-Router-Signature': bs58.encode(signature)
            };

            const rpcBody = {
                jsonrpc: '2.0',
                method: method,
                params: params,
                id: `task-${Date.now()}`
            };

            console.log(`[Router] Executing Task: ${service}.${method}`);
            await axios.post(targetSvc.url, rpcBody, { headers });
            
        } catch (e) {
            console.error(`[Router] Task Execution Failed:`, e.message);
            const errorLog = {
                code: 'TASK_ERROR',
                error: e.message,
                request: task,
                stamp: new Date().toISOString()
            };
            if (redisClient && redisClient.isOpen) {
                await redisClient.rPush('ERROR:QUEUE:router', JSON.stringify(errorLog));
            }
        }
    }
}

module.exports = { processTasks };
