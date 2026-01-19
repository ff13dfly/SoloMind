/**
 * Federated Category Registry Handlers
 * Implements system.category.* methods for global category key management
 */

const chalk = require('chalk');

const CATEGORY_REGISTRY_KEY = 'SYSTEM:REGISTRY:CATEGORIES';

/**
 * Create category handlers with injected dependencies
 */
function createCategoryHandlers(redisClient, SERVICES) {
    return {
        /**
         * system.category.reserve - Atomic reservation of category key
         */
        async reserve(params, id, res) {
            let { key, service, scope, type, desc, createdBy } = params;
            if (!key || !service) {
                return res.json({ jsonrpc: '2.0', error: { code: -32602, message: 'Missing required params: key, service' }, id });
            }
            
            key = key.toUpperCase();
            
            try {
                const existing = await redisClient.hGet(CATEGORY_REGISTRY_KEY, key);
                if (existing) {
                    const data = JSON.parse(existing);
                    if (data.status === 'ACTIVE') {
                        return res.json({ 
                            jsonrpc: '2.0', 
                            error: { 
                                code: -32010, 
                                message: 'CATEGORY_KEY_CONFLICT', 
                                data: { owner: data.owner } 
                            }, 
                            id 
                        });
                    }
                }
                
                const now = Date.now();
                const categoryMeta = {
                    owner: service,
                    scope: scope || 'LOCAL',
                    type: type || 'LIST',
                    status: 'ACTIVE',
                    desc: desc || '',
                    createdAt: existing ? JSON.parse(existing).createdAt : now,
                    updatedAt: now,
                    createdBy: createdBy || `system@${service}`
                };
                
                await redisClient.hSet(CATEGORY_REGISTRY_KEY, key, JSON.stringify(categoryMeta));
                console.log(chalk.green(`[Router] Category reserved: ${key} -> ${service}`));
                
                return res.json({ jsonrpc: '2.0', result: { success: true, key, ...categoryMeta }, id });
            } catch (e) {
                console.error('[Router] Category reserve error:', e.message);
                return res.json({ jsonrpc: '2.0', error: { code: -32000, message: e.message }, id });
            }
        },

        /**
         * system.category.delete - Soft delete category
         */
        async delete(params, id, res) {
            let { key, service } = params;
            if (!key) {
                return res.json({ jsonrpc: '2.0', error: { code: -32602, message: 'Missing required param: key' }, id });
            }
            
            key = key.toUpperCase();
            
            try {
                const existing = await redisClient.hGet(CATEGORY_REGISTRY_KEY, key);
                if (!existing) {
                    return res.json({ jsonrpc: '2.0', error: { code: -32011, message: 'CATEGORY_NOT_FOUND' }, id });
                }
                
                const data = JSON.parse(existing);
                
                if (service && data.owner !== service) {
                    return res.json({ jsonrpc: '2.0', error: { code: -32012, message: 'CATEGORY_PERMISSION_DENIED' }, id });
                }
                
                data.status = 'DELETED';
                data.updatedAt = Date.now();
                await redisClient.hSet(CATEGORY_REGISTRY_KEY, key, JSON.stringify(data));
                console.log(chalk.yellow(`[Router] Category soft-deleted: ${key}`));
                
                return res.json({ jsonrpc: '2.0', result: { success: true }, id });
            } catch (e) {
                console.error('[Router] Category delete error:', e.message);
                return res.json({ jsonrpc: '2.0', error: { code: -32000, message: e.message }, id });
            }
        },

        /**
         * system.category.locate - Find owner service for a key
         */
        async locate(params, id, res) {
            let { key } = params;
            if (!key) {
                return res.json({ jsonrpc: '2.0', error: { code: -32602, message: 'Missing required param: key' }, id });
            }
            
            key = key.toUpperCase();
            
            try {
                const existing = await redisClient.hGet(CATEGORY_REGISTRY_KEY, key);
                if (!existing) {
                    return res.json({ jsonrpc: '2.0', error: { code: -32011, message: 'CATEGORY_NOT_FOUND' }, id });
                }
                
                const data = JSON.parse(existing);
                const ownerService = SERVICES[data.owner];
                
                return res.json({ 
                    jsonrpc: '2.0', 
                    result: { 
                        key,
                        ownerService: data.owner,
                        endpoint: ownerService?.url || null,
                        searchIndex: `idx:${data.owner}`,
                        scope: data.scope,
                        type: data.type,
                        status: data.status
                    }, 
                    id 
                });
            } catch (e) {
                console.error('[Router] Category locate error:', e.message);
                return res.json({ jsonrpc: '2.0', error: { code: -32000, message: e.message }, id });
            }
        },

        /**
         * system.category.list - List all registered categories
         */
        async list(params, id, res) {
            const { includeDeleted } = params || {};
            
            try {
                const all = await redisClient.hGetAll(CATEGORY_REGISTRY_KEY);
                const categories = Object.entries(all).map(([key, value]) => {
                    const data = JSON.parse(value);
                    return { key, ...data };
                });
                
                const filtered = includeDeleted 
                    ? categories 
                    : categories.filter(c => c.status === 'ACTIVE');
                
                return res.json({ jsonrpc: '2.0', result: filtered, id });
            } catch (e) {
                console.error('[Router] Category list error:', e.message);
                return res.json({ jsonrpc: '2.0', error: { code: -32000, message: e.message }, id });
            }
        }
    };
}

module.exports = { createCategoryHandlers };
