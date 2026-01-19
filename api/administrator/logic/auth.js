const crypto = require('crypto');
const db = require('../db'); // Fallback for local development
const config = require('../config');
const { createClient } = require('redis');

let redisClient;
let sweepInterval;

// In-memory challenge store (Use Redis for production)
const challengeStore = new Map();

/**
 * 从 Redis 获取用户，fallback 到 db.js
 */
async function getUser(username) {
    // 优先从 Redis 读取
    if (redisClient && redisClient.isOpen) {
        try {
            const key = config.redis.userKeyPrefix + username;
            const userData = await redisClient.get(key);
            if (userData) {
                console.log(`[Admin] User "${username}" loaded from Redis`);
                return JSON.parse(userData);
            }
        } catch (err) {
            console.error('[Admin] Redis read error:', err.message);
        }
    }
    
    // Fallback 到硬编码的 db.js
    const localUser = db.users.find(u => u.username === username);
    if (localUser) {
        console.log(`[Admin] User "${username}" loaded from db.js (fallback)`);
    }
    return localUser;
}

const AuthLogic = {
    async init() {
        try {
            if (!redisClient) {
                redisClient = createClient();
                redisClient.on('error', err => console.error('[Admin] Redis Client Error', err));
                await redisClient.connect();
                console.log('[Admin] Connected to Redis');
            }

            if (!sweepInterval) {
                sweepInterval = setInterval(() => {
                    const now = Date.now();
                    for (const [key, value] of challengeStore.entries()) {
                        if (value.expiresAt < now) {
                            challengeStore.delete(key);
                        }
                    }
                }, 60000);
            }
        } catch (err) {
            console.error('[Admin] Redis initialization failed:', err);
        }
    },

    async cleanup() {
        if (sweepInterval) {
            clearInterval(sweepInterval);
            sweepInterval = null;
        }
        if (redisClient && redisClient.isOpen) {
            await redisClient.disconnect();
        }
    },

    getRedisClient() {
        return redisClient;
    },

    async loginRequest(params) {
        const { username } = params;
        console.log(`[LoginRequest] User: ${username}`);

        const user = await getUser(username);

        // If user not found, generate fake salt to prevent enumeration
        const salt = user ? user.salt : crypto.randomBytes(16).toString('hex');
        const iterations = user ? user.iterations : config.defaultIterations;

        // Generate Challenge
        const challenge = crypto.randomBytes(16).toString('hex');
        
        challengeStore.set(challenge, {
            username: username, 
            expiresAt: Date.now() + config.challengeTtl
        });

        return {
            challenge,
            salt,
            iterations
        };
    },

    async loginVerify(params) {
        const { username, challenge, response } = params;
        console.log(`[LoginVerify] User: ${username}, Challenge: ${challenge}`);

        const storedChallenge = challengeStore.get(challenge);

        if (!storedChallenge) {
            throw new Error('Invalid or expired challenge');
        }

        // Ensure challenge was meant for this user
        if (storedChallenge.username !== username) {
            throw new Error('Challenge mismatch');
        }
        
        // Find user (from Redis or fallback)
        const user = await getUser(username);
        if (!user) {
            throw new Error('Authentication failed');
        }

        // Verify Signature
        const expected = crypto.createHash('sha256')
            .update(challenge + user.login_hash)
            .digest('hex');

        if (response === expected) {
            // Success
            challengeStore.delete(challenge); 
            const token = crypto.randomBytes(32).toString('hex');
            
            // Store session in Redis
            if (redisClient && redisClient.isOpen) {
                const sessionData = {
                    username: user.username,
                    role: user.role || (user.username === 'admin' ? 'admin' : 'user'),
                    permit: user.permit || {
                        allow_all: user.username === 'admin',
                        services: {}
                    },
                    loginAt: new Date().toISOString()
                };
                await redisClient.setEx(`session:${token}`, 86400, JSON.stringify(sessionData)); // 24h expiration
            }

            return { success: true, token };
        } else {
            throw new Error('Authentication failed');
        }
    },

    /**
     * 创建或更新管理员用户（写入 Redis）
     */
    async createUser(params) {
        const { username, password, role = 'operator' } = params;
        
        if (!username || !password) {
            throw new Error('username and password are required');
        }

        if (!redisClient || !redisClient.isOpen) {
            throw new Error('Redis not connected');
        }

        // 生成 salt 和 hash
        const salt = crypto.randomBytes(16).toString('hex');
        const iterations = config.defaultIterations;
        
        // 使用与前端相同的算法: PBKDF2(password + username, salt, iterations, 32, 'sha256')
        const loginHash = crypto.pbkdf2Sync(
            password + username,
            Buffer.from(salt, 'hex'),
            iterations,
            32,
            'sha256'
        ).toString('hex');

        const userData = {
            username,
            salt,
            iterations,
            login_hash: loginHash,
            role,
            createdAt: new Date().toISOString()
        };

        // 写入 Redis
        const key = config.redis.userKeyPrefix + username;
        await redisClient.set(key, JSON.stringify(userData));
        await redisClient.sAdd(config.redis.userListKey, username);

        console.log(`[Admin] User "${username}" created in Redis`);
        return { success: true, username, role };
    },

    /**
     * 列出所有管理员用户
     */
    async listUsers() {
        if (!redisClient || !redisClient.isOpen) {
            // Fallback to db.js
            return db.users.map(u => ({ username: u.username, role: u.role || 'user' }));
        }

        const usernames = await redisClient.sMembers(config.redis.userListKey);
        const users = [];
        
        for (const username of usernames) {
            const key = config.redis.userKeyPrefix + username;
            const userData = await redisClient.get(key);
            if (userData) {
                const user = JSON.parse(userData);
                users.push({ username: user.username, role: user.role });
            }
        }

        // 如果 Redis 为空，返回 db.js 的用户
        if (users.length === 0) {
            return db.users.map(u => ({ username: u.username, role: u.role || 'user' }));
        }

        return users;
    }
};

module.exports = AuthLogic;

