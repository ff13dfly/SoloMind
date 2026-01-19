const crypto = require('crypto');
const bs58 = require('bs58').default || require('bs58');
const { generateId, validateId } = require('./utils/id_generator');

// Factory function to inject dependencies
module.exports = (redisClient, config) => ({
    // 1. User Register
    async register(params) {
        const { name, email, phone, salt, hash } = params;
        if (!name) throw { code: -32602, message: 'Missing name' };

        try {
            // Check existence
            const existingUid = await redisClient.get(`user:name:${name}`);
            if (existingUid) throw { code: -32001, message: 'User already exists' };

            // Generate Base58 UID
            const uid = generateId(config.idLengths?.user || 16);
            const now = new Date().toISOString();
            
            // Auto-generate crypto if missing (for AI/Onboarding flows)
            const finalSalt = salt || crypto.randomBytes(16).toString('hex');
            // Default hash if not provided (random password equivalent)
            const finalHash = hash || crypto.createHash('sha256').update(crypto.randomBytes(16).toString('hex')).digest('hex');

            const userData = {
                id: uid,
                name,
                email: email || '', // Store email
                phone: phone || '', // Store phone number
                salt: finalSalt,
                hash: finalHash, // The 'login_hash' derived from password + salt
                lang: 'zh', // Default language
                way: 1,
                permit: {
                    allow_all: false,
                    services: {}
                },
                devices: {}, // Structure for multi-device: { deviceId: { last: '...', platform: '...' } }
                create: now,
                last: now
            };

            // Simple admin promotion (mock)
            if (name.includes('admin')) {
                userData.permit = {
                    allow_all: true,
                    services: {}
                };
            }

            // Transactional save
            await redisClient.set(`user:${uid}`, JSON.stringify(userData));
            await redisClient.set(`user:name:${name}`, uid);
            await redisClient.sAdd('user:ids', uid);

            return { success: true, uid };
        } catch (err) {
            if (err.code) throw err;
            console.error(err);
            throw { code: -32603, message: 'Storage error' };
        }
    },

    // 2. Login Request (Challenge)
    async loginRequest(params) {
        const { name } = params;
        if (!name) throw { code: -32602, message: 'Missing name' };

        try {
            const uid = await redisClient.get(`user:name:${name}`);
            if (!uid) throw { code: -32002, message: 'User not found' };

            const userDataStr = await redisClient.get(`user:${uid}`);
            if (!userDataStr) throw { code: -32002, message: 'Data consistency error' };
            const userData = JSON.parse(userDataStr);

            // Check if user has permission to login
            const permit = userData.permit || { allow_all: false, services: {} };
            let normalizedPermit = permit;
            if (typeof permit === 'string') {
                normalizedPermit = { allow_all: permit === 'admin', services: {} };
            }
            
            const hasPermissions = normalizedPermit.allow_all || 
                                  (normalizedPermit.services && Object.keys(normalizedPermit.services).length > 0);
            
            if (!hasPermissions) {
                // throw { code: -32604, message: 'Forbidden: User does not have permission to login' };
                // Relaxed for now or logic might break if no services are assigned yet but user exists
            }

            // Generate Challenge
            const challenge = crypto.randomBytes(16).toString('hex');
            // Store challenge with short TTL (e.g. 2 mins)
            await redisClient.setEx(`challenge:${name}`, 120, challenge);

            return { 
                challenge, 
                salt: userData.salt, 
                iterations: 200000 
            };
        } catch (err) {
            if (err.code) throw err;
            throw { code: -32603, message: 'Internal error' };
        }
    },

    // 3. Login Verify
    async loginVerify(params) {
        const { name, challenge, response, deviceId } = params; 
        if (!name || !challenge || !response) throw { code: -32602, message: 'Missing params' };

        try {
             // 1. Verify Challenge
             const storedChallenge = await redisClient.get(`challenge:${name}`);
             if (!storedChallenge || storedChallenge !== challenge) {
                 throw { code: -32003, message: 'Invalid or expired challenge' };
             }

             // 2. Get User
             const uid = await redisClient.get(`user:name:${name}`);
             if (!uid) throw { code: -32002, message: 'User not found' };
             
             const str = await redisClient.get(`user:${uid}`);
             const user = JSON.parse(str);

             // 3. Verify Signature
             const expected = crypto.createHash('sha256').update(challenge + user.hash).digest('hex');
             
             if (response !== expected) {
                 throw { code: -401, message: 'Authentication failed' };
             }

             // 4. Success - Handle Session & Device Info
             const token = crypto.randomBytes(32).toString('hex');
             const now = new Date().toISOString();

             // Update User Device Info
             const deviceKey = deviceId || 'unknown_device';
             user.devices = user.devices || {};
             user.devices[deviceKey] = {
                 last: now,
                 token_prefix: token.substring(0, 8) 
             };
             user.last = now; // Global last login

             await redisClient.set(`user:${uid}`, JSON.stringify(user));
             await redisClient.del(`challenge:${name}`); // One-time use

             // Store Session
             const sessionData = {
                 uid: user.id,
                 name: user.name,
                 deviceId: deviceKey,
                 loginAt: now,
                 permit: user.permit, // CRITICAL: Pass permissions to Router
                 role: user.role || (user.permit?.allow_all ? 'admin' : 'user') 
             };
             // 7 days session
             await redisClient.setEx(`session:${token}`, 86400 * 7, JSON.stringify(sessionData));

              // Ensure permit is returned (normalize legacy format)
              let permit = user.permit;
              if (typeof permit === 'string') {
                  permit = {
                      allow_all: permit === 'admin',
                      services: {}
                  };
              }
              return { success: true, token, uid: user.id, permit };
        } catch (err) {
            if (err.code) throw err;
            console.error(err);
            throw { code: -32603, message: 'Login failed' };
        }
    },

    // 4. User Profile
    async getProfile({ uid }) {
        if (!uid) throw { code: -32602, message: 'Missing uid' };
        if (!validateId(uid, config.idLengths?.user || 16)) throw { code: -32602, message: 'Invalid ID format' };
        const data = await redisClient.get(`user:${uid}`);
        if (!data) throw { code: -32002, message: 'User not found' };
        return JSON.parse(data);
    },

    // 4. User Restore (from soft delete)
    async restore({ id, uid }) {
        const targetId = id || uid;
        if (!targetId || (targetId.length !== 16 && targetId.length !== 8)) throw new Error('INVALID_ID');

        const key = `user:${targetId}`;
        const data = await redisClient.get(key);
        if (!data) throw new Error('NOT_FOUND');

        const user = JSON.parse(data);
        if (user.status === 'ACTIVE') return { success: true };

        user.status = 'ACTIVE';
        delete user.deletedAt;
        
        await redisClient.set(key, JSON.stringify(user));
        return { success: true, id: targetId };
    },

    async checkDestroyable({ id, uid }) {
        return { canDestroy: true };
    },

    async destroy({ id, uid }) {
        const targetId = id || uid;
        if (!targetId || (targetId.length !== 16 && targetId.length !== 8)) throw new Error('INVALID_ID');

        const key = `user:${targetId}`;
        const data = await redisClient.get(key);
        if (!data) throw new Error('NOT_FOUND');

        const user = JSON.parse(data);
        
        // Remove from indexes
        await redisClient.sRem('user:ids', targetId);
        if (user.name) {
            await redisClient.del(`user:name:${user.name}`);
        }
        await redisClient.del(key);
        
        return { success: true, id: targetId };
    },

    // 5. User List
    async list({ page = 1, limit = 12, keyword = '', includeDeleted = false } = {}) {
        let ids = [];

        if (keyword && keyword.trim().length > 0) {
            // Fuzzy search using KEYS
            const pattern = `user:name:*${keyword.trim()}*`;
            const matchingKeys = await redisClient.keys(pattern);
            
            for (const key of matchingKeys) {
                const uid = await redisClient.get(key);
                if (uid) ids.push(uid);
            }
        } else {
            // Standard list
            ids = await redisClient.sMembers('user:ids');
        }

        const users = [];
        for (const uid of ids) {
            const data = await redisClient.get(`user:${uid}`);
            if (data) {
                const user = JSON.parse(data);
                if (includeDeleted || user.status !== 'DELETED') {
                    users.push(user);
                }
            }
        }

        // Sorting (Newest first)
        users.sort((a, b) => new Date(b.create).getTime() - new Date(a.create).getTime());

        const total = users.length;
        const p = parseInt(page);
        const l = parseInt(limit);
        const start = (p - 1) * l;
        const slicedUsers = users.slice(start, start + l);

        return {
            users: slicedUsers,
            total,
            page: p,
            pageSize: l
        };
    },

    // 6. Get Service Status
    async getStatus() {
        // userCount is handled in index, but logic can expose it too
        const userCount = await redisClient.sCard('user:ids') || 0;
        return {
            userCount,
            uptime: process.uptime()
        };
    },

    // 7. Permission Management
    // 7.1 Update Permit
    async updatePermit(params) {
        const { uid, permit } = params;
        if (!uid || !permit) throw { code: -32602, message: 'Missing params' };
        if (!validateId(uid, config.idLengths?.user || 16)) throw { code: -32602, message: 'Invalid ID format' };
        
        // Basic validation of permit structure
        if (typeof permit.allow_all !== 'boolean' || typeof permit.services !== 'object') {
             throw { code: -32602, message: 'Invalid permit structure' };
        }

        try {
            const userDataStr = await redisClient.get(`user:${uid}`);
            if (!userDataStr) throw { code: -32002, message: 'User not found' };
            
            const userData = JSON.parse(userDataStr);
            userData.permit = permit;
            
            await redisClient.set(`user:${uid}`, JSON.stringify(userData));
            
            return { success: true, uid };
        } catch (err) {
            if (err.code) throw err;
            console.error(err);
            throw { code: -32603, message: 'Storage error' };
        }
    },

    // 7.2 Get Permit
    async getPermit(params) {
        const { uid } = params;
        if (!uid) throw { code: -32602, message: 'Missing uid' };
        if (!validateId(uid, config.idLengths?.user || 16)) throw { code: -32602, message: 'Invalid ID format' };
        
        try {
            const userDataStr = await redisClient.get(`user:${uid}`);
            if (!userDataStr) throw { code: -32002, message: 'User not found' };
            
            const userData = JSON.parse(userDataStr);
            // Return normalized permit
            let permit = userData.permit || { allow_all: false, services: {} };
             if (typeof permit === 'string') {
                permit = { allow_all: permit === 'admin', services: {} };
            }
            return { uid, permit };
        } catch (err) {
            if (err.code) throw err;
            throw { code: -32603, message: 'Internal error' };
        }
    },

    // 7.3 Batch Update Permits
    async batchPermits(params) {
        const { permits } = params; // Array of { uid, permit }
        if (!Array.isArray(permits)) throw { code: -32602, message: 'permits must be an array' };
        
        const results = [];
        for (const item of permits) {
            try {
                await this.updatePermit(item);
                results.push({ uid: item.uid, success: true });
            } catch (err) {
                 results.push({ uid: item.uid, success: false, error: err.message });
            }
        }
        return { results };
    },

    // 8. User Update (Generic Profile Update)
    async update(params) {
        const { uid, categories, ...others } = params;
        if (!uid) throw { code: -32602, message: 'Missing uid' };
        if (!validateId(uid, config.idLengths?.user || 16)) throw { code: -32602, message: 'Invalid ID format' };

        try {
            const userDataStr = await redisClient.get(`user:${uid}`);
            if (!userDataStr) throw { code: -32002, message: 'User not found' };
            
            const userData = JSON.parse(userDataStr);
            
            // Update Categories
            if (categories) {
                userData.categories = {
                    ...(userData.categories || {}),
                    ...categories
                };
            }

            // Future: Handle other fields (others) like nickname, avatar, etc.
            // if (others.nickname) userData.nickname = others.nickname;
            if (others.lang) userData.lang = others.lang;
            
            
            await redisClient.set(`user:${uid}`, JSON.stringify(userData));
            return { success: true, uid, categories: userData.categories };
        } catch (err) {
            if (err.code) throw err;
            console.error(err);
            throw { code: -32603, message: 'Storage error' };
        }
    },

    // 9. Soft Delete
    async remove(params) {
        const id = params.id || params.uid;
        if (!id) throw { code: -32602, message: 'Missing id' };
        if (!validateId(id, config.idLengths?.user || 16)) throw { code: -32602, message: 'Invalid ID format' };

        try {
            const userDataStr = await redisClient.get(`user:${id}`);
            if (!userDataStr) throw { code: -32002, message: 'User not found' };
            
            const userData = JSON.parse(userDataStr);
            if (userData.status === 'DELETED') return { success: true, message: 'Already deleted' };

            userData.status = 'DELETED';
            userData.deletedAt = new Date().toISOString();
            
            await redisClient.set(`user:${id}`, JSON.stringify(userData));
            return { success: true, id };
        } catch (err) {
            if (err.code) throw err;
            throw { code: -32603, message: 'Internal error' };
        }
    }
});
