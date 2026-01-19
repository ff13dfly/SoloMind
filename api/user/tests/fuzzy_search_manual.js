const assert = require('assert');
const createLogic = require('../logic');

// Mock Redis Client
const mockRedis = {
    data: {
        'user:ids': new Set(['u1', 'u2', 'u3']),
        'user:name:Admin': 'u1',
        'user:name:Bob': 'u2',
        'user:name:Alice': 'u3',
        'user:u1': JSON.stringify({ id: 'u1', name: 'Admin', create: '2023-01-01' }),
        'user:u2': JSON.stringify({ id: 'u2', name: 'Bob', create: '2023-01-02' }),
        'user:u3': JSON.stringify({ id: 'u3', name: 'Alice', create: '2023-01-03' })
    },
    async sMembers(key) {
        return Array.from(this.data[key] || []);
    },
    async get(key) {
        return this.data[key] || null;
    },
    // Mock scanIterator
    async *scanIterator({ MATCH }) {
        // Simple regex match based on glob pattern user:name:*keyword*
        // Convert glob to regex
        const regexStr = MATCH.replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexStr}$`);
        
        for (const key of Object.keys(this.data)) {
            if (regex.test(key)) {
                yield key;
            }
        }
    }
};

async function test() {
    console.log('Starting Search Verification...');
    const methods = createLogic(mockRedis, { serviceName: 'test' });
    const userLogic = methods.user;

    // Test 1: No keyword (return all)
    console.log('Test 1: List all users...');
    const res1 = await userLogic.list({});
    assert.strictEqual(res1.users.length, 3, 'Should return all 3 users');
    console.log('✅ PASS');

    // Test 2: Search "Admin"
    console.log('Test 2: Search "Admin"...');
    const res2 = await userLogic.list({ keyword: 'Admin' });
    assert.strictEqual(res2.users.length, 1, 'Should return 1 user');
    assert.strictEqual(res2.users[0].name, 'Admin');
    console.log('✅ PASS');
    
    // Test 3: Search "b" (should match Bob)
    console.log('Test 3: Search "b"...');
    const res3 = await userLogic.list({ keyword: 'b' });
    // "b" matches "Bob" (case sensitive in my glob? No, key is "user:name:Bob", my regex .*b.* matches Bob? "Bob" has b)
    // Actually my regex logic above: user:name:*b* -> ^user:name:.*b.*$
    // "user:name:Bob" -> matches because of last b.
    // "user:name:Alice" -> no b.
    // "user:name:Admin" -> no b.
    assert.strictEqual(res3.users.length, 1, 'Should return Bob');
    assert.strictEqual(res3.users[0].name, 'Bob');
    console.log('✅ PASS');

    console.log('All tests passed!');
}

test().catch(e => {
    console.error('FAILED:', e);
    process.exit(1);
});
