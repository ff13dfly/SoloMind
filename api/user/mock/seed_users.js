const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('redis');
const bs58 = require('bs58').default || require('bs58');

const MOCK_DIR = __dirname;
const USERS_FILE = path.join(MOCK_DIR, 'users.json');

const generateRandomUser = (index) => {
    const name = `user_${index}_${crypto.randomBytes(3).toString('hex')}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const password = `pass_${crypto.randomBytes(4).toString('hex')}`; // Random password for testing
    // Simulate login hash
    const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
    const uid = bs58.encode(crypto.randomBytes(12));
    const now = new Date().toISOString();

    const lastLogin = new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString();

    return {
        id: uid,
        name,
        salt,
        hash,
        password, // Included for testing
        way: 1,
        devices: Math.random() > 0.5 ? {
            'mock_device': { last: lastLogin, token_prefix: 'mock' }
        } : {},
        create: now,
        last: lastLogin
    };
};

(async () => {
    console.log('Generating 30 mock users with Base58 UIDs and passwords...');
    const users = [];
    for (let i = 1; i <= 30; i++) {
        users.push(generateRandomUser(i));
    }

    // Save full objects (with passwords) to JSON
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log(`Saved mock users to ${USERS_FILE}`);

    const client = createClient();
    client.on('error', err => console.error('Redis Client Error', err));
    
    try {
        await client.connect();
        console.log('Connected to Redis.');

        // 1. Cleanup old mock users (best effort logic)
        // We delete users in 'user:ids' to keep the list specific to this mock run, 
        // effectively resetting the directory for clarity.
        // NOTE: This deletes ALL users tracked in user:ids.
        const existingIds = await client.sMembers('user:ids');
        if (existingIds.length > 0) {
            console.log(`Cleaning up ${existingIds.length} existing users...`);
            for (const uid of existingIds) {
                // We need to find the name to clean up mapping
                const userJson = await client.get(`user:${uid}`);
                if (userJson) {
                    const u = JSON.parse(userJson);
                    await client.del(`user:name:${u.name}`);
                }
                await client.del(`user:${uid}`);
            }
            await client.del('user:ids');
        }

        console.log('Seeding new data...');
        for (const user of users) {
             const userForRedis = { ...user };
             // Optionally remove password from Redis storage if strict
             // delete userForRedis.password; 
             // Leaving it for now as "mock data" implies developer convenience.

             await client.set(`user:${user.id}`, JSON.stringify(userForRedis));
             await client.set(`user:name:${user.name}`, user.id);
             await client.sAdd('user:ids', user.id);
        }
        
        console.log('Redis seeding complete.');
    } catch (e) {
        console.error('Seeding failed:', e);
    } finally {
        await client.disconnect();
    }
})();
