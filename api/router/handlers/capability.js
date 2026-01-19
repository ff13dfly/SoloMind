/**
 * Capability Map Handler
 * Manages dynamic capability mapping table for service method discovery
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Path to hardcoded API returns data
const API_RETURNS_FILE = path.join(__dirname, '../data/api-returns.json');

// Capability Mapping Table (Dynamic)
const CAPABILITY_MAP = {};
// Cache for API returns data
let API_RETURNS_CACHE = null;

// Redis Key
const REDIS_CAPABILITY_KEY = 'system:capabilities';

/**
 * Helper: Apply returns data to capability map
 * Can be called after map updates (e.g. addService, updateCapabilityMap)
 */
function enrichCapabilityMap() {
    if (!API_RETURNS_CACHE) return 0;
    
    let merged = 0;
    for (const [method, returns] of Object.entries(API_RETURNS_CACHE)) {
        if (CAPABILITY_MAP[method]) {
            // Only update if returns is missing or different, to avoid unnecessary writes? 
            // Actually nice to just overwrite to ensure consistency.
            CAPABILITY_MAP[method].returns = returns;
            merged++;
        }
    }
    return merged;
}

const CapabilityBuilder = require('../logic/capability_builder');
const AGENT_CAPABILITY_SNAPSHOT_KEY = 'AGENT:CAPABILITY_SNAPSHOT';

/**
 * Update capability map by introspecting all services (Incremental & Robust)
 * @param {object} SERVICES - Services registry
 * @param {object} redisClient - Redis client
 */
async function updateCapabilityMap(SERVICES, redisClient) {
    let hasChanges = false;
    
    // Sync current valid services
    for (const [name, svc] of Object.entries(SERVICES)) {
        if (!svc.url) continue;
        
        try {
            // Introspect Service
            const res = await axios.post(svc.url, { jsonrpc: '2.0', method: 'methods', id: 'sys-map' });
            
            let methods = [];
            let description = {};

            if (Array.isArray(res.data.result)) {
                methods = res.data.result;
            } else if (res.data.result && res.data.result.methods) {
                methods = res.data.result.methods;
                description = res.data.result.description || {};
            }

            if (methods.length > 0) {
                svc.methods = methods;
                svc.description = description;

                // 1. Identify methods to remove (cleanup stale methods for this service)
                const currentServiceMethods = Object.keys(CAPABILITY_MAP).filter(k => 
                    CAPABILITY_MAP[k] && CAPABILITY_MAP[k].service === name
                );
                const newMethodNames = new Set(methods.map(m => m.name));
                
                currentServiceMethods.forEach(k => {
                    if (!newMethodNames.has(k)) {
                        delete CAPABILITY_MAP[k];
                        hasChanges = true;
                    }
                });

                // 2. Add/Update new methods
                methods.forEach(m => {
                    CAPABILITY_MAP[m.name] = { 
                        service: name, 
                        url: svc.url,
                        desc: m.description,
                        params: m.params,
                        returns: m.returns, // Pass through returns from introspection
                        ai: m.ai || false,
                        public: m.public || false,
                        serviceDesc: description
                    };
                });
                
                console.log(`[Router] Updated capabilities for ${name} (${methods.length} methods)`);
                hasChanges = true;
            }
        } catch (e) {
            console.warn(`[Router] Failed to introspect ${name}: ${e.message} (Retaining existing capabilities if available)`);
            // Do NOT remove existing capabilities on failure -> Transient failure protection
        }
    }

    // Re-apply returns data (Generic overrides)
    enrichCapabilityMap();

    if (hasChanges && redisClient && redisClient.isOpen) {
        await redisClient.set(REDIS_CAPABILITY_KEY, JSON.stringify(CAPABILITY_MAP));
        await redisClient.set('active_services', JSON.stringify(SERVICES));

        // --- NEW: Build AI Capability Snapshot ---
        const aiSnapshot = { zh: [], en: [] };
        
        for (const [name, svc] of Object.entries(SERVICES)) {
            if (svc.methods && svc.methods.length > 0) {
                const meta = CapabilityBuilder.buildCapabilityMeta(name, svc.methods, svc);
                aiSnapshot.zh.push(...meta.zh);
                aiSnapshot.en.push(...meta.en);
            }
        }
        
        await redisClient.set(`${AGENT_CAPABILITY_SNAPSHOT_KEY}:ZH`, JSON.stringify(aiSnapshot.zh));
        await redisClient.set(`${AGENT_CAPABILITY_SNAPSHOT_KEY}:EN`, JSON.stringify(aiSnapshot.en));
        console.log(`[Router] Published AI Capability Snapshot (${aiSnapshot.zh.length} items)`);
    }
}

/**
 * Load hardcoded API returns data and merge into capability map
 * This adds 'returns' field to each capability for EXTRACT suggestions
 */
function loadApiReturns() {
    try {
        if (fs.existsSync(API_RETURNS_FILE)) {
            const data = JSON.parse(fs.readFileSync(API_RETURNS_FILE, 'utf8'));
            API_RETURNS_CACHE = data; // Cache the data
            const merged = enrichCapabilityMap(); // Apply it
            console.log(`[Router] Loaded API returns: ${merged} methods enriched from ${API_RETURNS_FILE}`);
            return merged;
        } else {
            console.log('[Router] No api-returns.json found, EXTRACT suggestions disabled');
            return 0;
        }
    } catch (e) {
        console.warn('[Router] Failed to load api-returns.json:', e.message);
        return 0;
    }
}

/**
 * Get the capability map
 * @returns {object}
 */
function getCapabilityMap() {
    return CAPABILITY_MAP;
}

/**
 * Get Redis key for capability storage
 * @returns {string}
 */
function getRedisKey() {
    return REDIS_CAPABILITY_KEY;
}

module.exports = {
    CAPABILITY_MAP,
    updateCapabilityMap,
    loadApiReturns,
    enrichCapabilityMap,
    getCapabilityMap,
    getRedisKey,
    REDIS_CAPABILITY_KEY
};
