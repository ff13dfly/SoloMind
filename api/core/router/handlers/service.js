/**
 * Service Registry Handlers
 * Implements system.* methods for service management
 */

const axios = require('axios');
const chalk = require('chalk');
const tweetnacl = require('tweetnacl');
const bs58 = require('bs58').default || require('bs58');

const { enrichCapabilityMap } = require('./capability');

/**
 * Add a new service via Z-handshake
 * @param {string} inputUrl - Service base URL
 * @param {object} SERVICES - Services registry
 * @param {object} redisClient - Redis client
 * @param {object} keypair - Router keypair for signing
 * @param {object} CAPABILITY_MAP - Capability map to update
 */
async function addService(inputUrl, SERVICES, redisClient, keypair, CAPABILITY_MAP) {
    let baseUrl = inputUrl.replace(/\/$/, '').replace(/\/jsonrpc$/, '');
    console.log(`[Router] Attempting to handshake with service at base: ${baseUrl}`);
    
    // 1. Get Seed
    const seedRes = await axios.get(`${baseUrl}/auth/seed`);
    const { seed } = seedRes.data;
    if (!seed) throw new Error('No seed received from service');

    // 2. Sign Seed
    const message = new TextEncoder().encode(seed);
    const signature = bs58.encode(tweetnacl.sign.detached(message, keypair.secretKey));
    
    // 3. Verify
    const verifyRes = await axios.post(`${baseUrl}/auth/verify`, {
        signature,
        publicKey: keypair.publicKey.toBase58()
    });

    if (verifyRes.data.success) {
        console.log('[Router] Handshake successful.');
        
        // 4. Introspection
        const methodRes = await axios.post(`${baseUrl}/jsonrpc`, {
            jsonrpc: '2.0',
            method: 'methods',
            id: Date.now()
        });
        
        let methods = [];
        let description = {};

        // Parse result (robust handling for array or object format)
        if (Array.isArray(methodRes.data.result)) {
            methods = methodRes.data.result;
        } else if (methodRes.data.result && methodRes.data.result.methods) {
            methods = methodRes.data.result.methods;
            description = methodRes.data.result.description || {};
        }

        // 5. Entities Introspection (Optional/Best Effort)
        let entities = {};
        try {
            const entitiesRes = await axios.post(`${baseUrl}/jsonrpc`, {
                jsonrpc: '2.0',
                method: 'entities',
                id: Date.now()
            }, { timeout: 2000 });
            
            if (entitiesRes.data && entitiesRes.data.result) {
                entities = entitiesRes.data.result;
            }
        } catch (e) {
            console.warn(`[Router] Service ${baseUrl} does not support "entities" method or it failed.`);
        }
        
        const serviceName = verifyRes.data.serviceName || `service_${Date.now()}`;
        const serviceVersion = verifyRes.data.version || 'unknown';
        
        SERVICES[serviceName] = {
            url: `${baseUrl}/jsonrpc`,
            methods: methods,
            entities: entities, // Store entities
            description: description,
            available: true,
            version: serviceVersion,
            lastLink: Date.now()
        };

        // Update Capability Map
        if (CAPABILITY_MAP && methods.length > 0) {
            methods.forEach(m => {
                CAPABILITY_MAP[m.name] = { 
                    service: serviceName, 
                    url: `${baseUrl}/jsonrpc`,
                    desc: m.description,
                    params: m.params,
                    returns: m.returns, // Pass through returns from introspection
                    ai: m.ai || false,
                    serviceDesc: description
                };
            });
            // Re-apply returns data
            enrichCapabilityMap();
        }
        
        if (redisClient && redisClient.isOpen) {
            await redisClient.set('active_services', JSON.stringify(SERVICES));
            if (CAPABILITY_MAP) {
                await redisClient.set('system:capabilities', JSON.stringify(CAPABILITY_MAP));
            }
        }
        console.log(`[Router] Service ${serviceName} added and saved to Redis.`);
        return { serviceName, methods, version: serviceVersion };
    } else {
        throw new Error('Handshake verification failed');
    }
}

/**
 * Create service handlers with injected dependencies
 */
function createServiceHandlers(SERVICES, CAPABILITY_MAP, redisClient) {
    return {
        /**
         * system.check_service_status - Ping service and update status
         */
        async checkServiceStatus(params, id, res) {
            const { serviceId } = params;
            const svc = SERVICES[serviceId];
            if (!svc) return res.json({ jsonrpc: '2.0', error: { code: -32004, message: 'Service not found' }, id });
            
            try {
                const start = Date.now();
                const pingRes = await axios.post(svc.url, { jsonrpc: '2.0', method: 'methods', id: Date.now() }, { timeout: 2000 });
                const latency = Date.now() - start;
                
                svc.lastLink = Date.now();
                svc.available = true;

                if (pingRes.data && pingRes.data.result) {
                    svc.methods = pingRes.data.result;
                    svc.methods.forEach(m => {
                        CAPABILITY_MAP[`${m.name}`] = { 
                            service: serviceId, 
                            url: svc.url,
                            desc: m.description, 
                            params: m.params,
                            returns: m.returns, // Fix: Ensure returns are preserved during status check updates
                            ai: m.ai || false
                        };
                    });
                    // Re-apply returns data
                    enrichCapabilityMap();
                }

                // 2. Refresh Entities (Best Effort)
                try {
                    const entitiesRes = await axios.post(svc.url, { jsonrpc: '2.0', method: 'entities', id: Date.now() }, { timeout: 2000 });
                    if (entitiesRes.data && entitiesRes.data.result) {
                        svc.entities = entitiesRes.data.result;
                    }
                } catch (e) {
                    // Ignore entity fetch failure on status check
                }
                
                if (redisClient && redisClient.isOpen) {
                    await redisClient.set('active_services', JSON.stringify(SERVICES));
                }

                return res.json({ 
                    jsonrpc: '2.0', 
                    result: { 
                        status: 'online', 
                        latency, 
                        lastLink: svc.lastLink,
                        entities: svc.entities,
                        methods: svc.methods
                    }, 
                    id 
                });
            } catch (e) {
                svc.available = false;
                if (redisClient && redisClient.isOpen) {
                    await redisClient.set('active_services', JSON.stringify(SERVICES));
                }
                return res.json({ jsonrpc: '2.0', result: { status: 'offline', error: e.message }, id });
            }
        },

        /**
         * system.capabilities - Return capability map
         */
        capabilities(id, res) {
            return res.json({ jsonrpc: '2.0', result: CAPABILITY_MAP, id });
        },

        /**
         * system.list_services - List all registered services
         */
        listServices(id, res) {
            const list = Object.entries(SERVICES).map(([id, svc]) => ({
                id,
                url: svc.url,
                status: svc.status || 'unknown',
                lastSeen: svc.lastLink ? new Date(svc.lastLink).toISOString() : null,
                version: svc.version,
                methods: svc.methods,
                entities: svc.entities || {}
            }));
            return res.json({ jsonrpc: '2.0', result: list, id });
        },

        /**
         * system.remove_service - Remove a service from registry
         */
        async removeService(params, id, res) {
            const serviceId = params.serviceId || params.name; // Support both parameter names
            if (SERVICES[serviceId]) {

                delete SERVICES[serviceId];
                
                // Clean up capabilities for this service immediately
                Object.keys(CAPABILITY_MAP).forEach(key => {
                    if (CAPABILITY_MAP[key].service === serviceId) {
                        delete CAPABILITY_MAP[key];
                    }
                });

                if (redisClient && redisClient.isOpen) {
                    await redisClient.set('active_services', JSON.stringify(SERVICES));
                    // Also sync the capability map to Redis
                    await redisClient.set('system:capabilities', JSON.stringify(CAPABILITY_MAP));
                }
                console.log(`[Router] Service ${serviceId} removed.`);
                return res.json({ jsonrpc: '2.0', result: { success: true }, id });
            } else {
                return res.json({ jsonrpc: '2.0', error: { code: -32004, message: 'Service not found' }, id });
            }
        }
    };
}

/**
 * Ensure administrator service exists in registry
 * @param {object} SERVICES - Services registry
 * @param {string} adminUrl - Administrator service URL
 */
function ensureAdministratorService(SERVICES, adminUrl) {
    if (!SERVICES.administrator) {
        SERVICES.administrator = {
            url: `${adminUrl}/jsonrpc`,
            methods: [],
            status: 'configured',
            available: true
        };
        console.log('[Router] Administrator service configured (default).');
    }
}

module.exports = { createServiceHandlers, addService, ensureAdministratorService };
