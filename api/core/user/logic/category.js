const http = require('http');
const https = require('https');
const { URL } = require('url');

module.exports = (redis, { serviceName, routerUrl }) => ({
    // Create category (with Router reservation)
    async create({ key, type, scope, desc, items }) {
        if (!key) throw new Error('MISSING_PARAM: key required');
        key = key.toUpperCase();
        
        const SERVICE_UPPER = serviceName.toUpperCase();
        
        // 1. Reserve in Router (Global Registry)
        const rpcUrl = routerUrl || process.env.ROUTER_URL || 'http://localhost:3000/jsonrpc';
        try {
            const reservation = await makeRpcCall(rpcUrl, 'system.category.reserve', {
                key,
                service: serviceName,
                scope: scope || 'LOCAL',
                type: type || 'LIST',
                desc: desc || ''
            });

            
            if (reservation.error) {
                throw new Error(reservation.error.message || 'ROUTER_RESERVATION_FAILED');
            }
        } catch (e) {
            console.error('[Sample] Category reservation failed:', e.message);
            throw e;
        }

        // 2. Create Locally
        const existingKey = `${SERVICE_UPPER}:CONFIG:CATEGORY:${key}`;
        const existing = await redis.get(existingKey);
        
        if (existing) {
            const data = JSON.parse(existing);
            if (data.status === 'ACTIVE') {
                 console.warn(`[${serviceName}] Overwriting locally ACTIVE category ${key} after successful Router reservation.`);
            }

        }
        
        const now = Date.now();
        const data = {
            key,
            type: type || 'LIST',
            scope: scope || 'LOCAL',
            desc: desc || '',
            items: items || [],
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now
        };
        
        await redis.set(existingKey, JSON.stringify(data));
        return data;
    },

    // Get single category by key
    async get({ key }) {
        if (!key) throw new Error('MISSING_PARAM: key required');
        key = key.toUpperCase();
        
        const SERVICE_UPPER = serviceName.toUpperCase();
        const data = await redis.get(`${SERVICE_UPPER}:CONFIG:CATEGORY:${key}`);
        if (!data) throw new Error('CATEGORY_NOT_FOUND');
        return JSON.parse(data);
    },

    // List all categories for this service
    async list({ includeDeleted = false } = {}) {
        const SERVICE_UPPER = serviceName.toUpperCase();
        const keys = await redis.keys(`${SERVICE_UPPER}:CONFIG:CATEGORY:*`);
        const categories = [];
        
        for (const k of keys) {
            const data = JSON.parse(await redis.get(k));
            if (includeDeleted || data.status === 'ACTIVE') {
                categories.push(data);
            }
        }
        
        return categories;
    },

    // Update category metadata
    async update({ key, desc, type }) {
        if (!key) throw new Error('MISSING_PARAM: key required');
        key = key.toUpperCase();
        
        const SERVICE_UPPER = serviceName.toUpperCase();
        const redisKey = `${SERVICE_UPPER}:CONFIG:CATEGORY:${key}`;
        const existing = await redis.get(redisKey);
        if (!existing) throw new Error('CATEGORY_NOT_FOUND');
        
        const data = JSON.parse(existing);
        
        if (desc !== undefined) data.desc = desc;
        if (type !== undefined) data.type = type;
        data.updatedAt = Date.now();
        
        await redis.set(redisKey, JSON.stringify(data));
        return data;
    },

    // Soft delete category
    async delete({ key }) {
        if (!key) throw new Error('MISSING_PARAM: key required');
        key = key.toUpperCase();
        
        const SERVICE_UPPER = serviceName.toUpperCase();
        
        // 1. Delete in Router
        const rpcUrl = routerUrl || process.env.ROUTER_URL || 'http://localhost:3000/jsonrpc';
        try {
            const result = await makeRpcCall(rpcUrl, 'system.category.delete', {
                key,
                service: serviceName
            });
            
            if (result.error) {
                if (result.error.code === -32012) {
                    throw new Error('ROUTER_PERMISSION_DENIED');
                }
                console.warn(`[${serviceName}] Router delete warning:`, result.error.message);
            }
        } catch (e) {
            if (e.message === 'ROUTER_PERMISSION_DENIED') throw e;
            console.error(`[${serviceName}] Router delete failed:`, e.message);
        }

        // 2. Delete Locally
        const redisKey = `${SERVICE_UPPER}:CONFIG:CATEGORY:${key}`;
        const existing = await redis.get(redisKey);
        if (!existing) throw new Error('CATEGORY_NOT_FOUND');
        
        const data = JSON.parse(existing);
        data.status = 'DELETED';
        data.updatedAt = Date.now();
        
        await redis.set(redisKey, JSON.stringify(data));
        return { success: true };
    },

    // Add item to category
    async itemAdd({ key, id, label, desc, parentId }) {
        if (!key) throw new Error('MISSING_PARAM: key required');
        key = key.toUpperCase();
        
        const SERVICE_UPPER = serviceName.toUpperCase();
        const redisKey = `${SERVICE_UPPER}:CONFIG:CATEGORY:${key}`;
        const existing = await redis.get(redisKey);
        if (!existing) throw new Error('CATEGORY_NOT_FOUND');
        
        const data = JSON.parse(existing);
        const itemId = id || `${key}_${Date.now().toString(36)}`;
        
        // Check for duplicate
        if (data.items.find(i => i.id === itemId)) {
            throw new Error('ITEM_ALREADY_EXISTS');
        }
        
        const newItem = {
            id: itemId,
            label: label || { zh: '', en: '' },
            desc: desc || '',
            parentId: parentId || null,
            createdAt: Date.now()
        };
        
        data.items.push(newItem);
        data.updatedAt = Date.now();
        
        await redis.set(redisKey, JSON.stringify(data));
        return newItem;
    },

    // Update category item
    async itemUpdate({ key, id, label, desc, parentId }) {
        if (!key || !id) throw new Error('MISSING_PARAM: key and id required');
        key = key.toUpperCase();
        
        const SERVICE_UPPER = serviceName.toUpperCase();
        const redisKey = `${SERVICE_UPPER}:CONFIG:CATEGORY:${key}`;
        const existing = await redis.get(redisKey);
        if (!existing) throw new Error('CATEGORY_NOT_FOUND');
        
        const data = JSON.parse(existing);
        const item = data.items.find(i => i.id === id);
        if (!item) throw new Error('ITEM_NOT_FOUND');
        
        if (label !== undefined) item.label = label;
        if (desc !== undefined) item.desc = desc;
        if (parentId !== undefined) item.parentId = parentId;
        item.updatedAt = Date.now();
        
        data.updatedAt = Date.now();
        await redis.set(redisKey, JSON.stringify(data));
        return item;
    },

    // Remove category item
    async itemRemove({ key, id }) {
        if (!key || !id) throw new Error('MISSING_PARAM: key and id required');
        key = key.toUpperCase();
        
        const SERVICE_UPPER = serviceName.toUpperCase();
        const redisKey = `${SERVICE_UPPER}:CONFIG:CATEGORY:${key}`;
        const existing = await redis.get(redisKey);
        if (!existing) throw new Error('CATEGORY_NOT_FOUND');
        
        const data = JSON.parse(existing);
        const index = data.items.findIndex(i => i.id === id);
        if (index === -1) throw new Error('ITEM_NOT_FOUND');
        
        data.items.splice(index, 1);
        data.updatedAt = Date.now();
        
        await redis.set(redisKey, JSON.stringify(data));
        return { success: true };
    }
});

function makeRpcCall(urlStr, method, params) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const client = url.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + (url.search || ''),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                     return reject(new Error(`RPC_HTTP_ERROR_${res.statusCode}: ${data}`));
                }
                
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('INVALID_JSON_RESPONSE'));
                }
            });
        });

        req.on('error', (e) => reject(e));
        
        req.write(JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id: Date.now()
        }));
        
        req.end();
    });
}
