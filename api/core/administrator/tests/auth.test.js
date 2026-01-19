const crypto = require('crypto');
const db = require('../db');

// Mock Redis
const mockRedisClient = {
    connect: jest.fn(),
    on: jest.fn(),
    setEx: jest.fn(),
    disconnect: jest.fn(),
    isOpen: true
};

jest.mock('redis', () => ({
    createClient: () => mockRedisClient
}));

// Import subject
const Auth = require('../auth');

describe('Administrator Auth (Legacy/Bootstrap)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    beforeAll(async () => {
        await Auth.init();
    });

    afterAll(async () => {
        await Auth.cleanup();
    });

    test('loginRequest should generate challenge for valid user', () => {
        const username = 'admin'; // Exists in db.js
        const res = Auth.loginRequest({ username });
        
        expect(res.challenge).toBeDefined();
        expect(res.salt).toBeDefined();
        // Since 'admin' is hardcoded in db.js, we check against that if possible.
        // db.js has salt '82f37fd14558c3741652aa2d4dcf88fd'
        expect(res.salt).toBe(db.users[0].salt);
    });

    test('loginRequest should return fake salt for unknown user', () => {
        const username = 'unknown_user';
        const res = Auth.loginRequest({ username });
        
        expect(res.challenge).toBeDefined();
        expect(res.salt).toBeDefined();
        expect(res.salt).not.toBe(db.users[0].salt);
    });

    test('loginVerify should succeed with correct password hash', async () => {
        const username = 'admin';
        const user = db.users[0];
        
        // 1. Request
        const req = Auth.loginRequest({ username });
        
        // 2. Compute Match
        // expected = sha256(challenge + login_hash)
        const response = crypto.createHash('sha256')
            .update(req.challenge + user.login_hash)
            .digest('hex');
            
        // 3. Verify
        const verifyRes = await Auth.loginVerify({
            username,
            challenge: req.challenge,
            response
        });
        
        expect(verifyRes.success).toBe(true);
        expect(verifyRes.token).toBeDefined();
        
        // Redis Session should be set
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
            expect.stringContaining('session:'),
            86400,
            expect.stringContaining('"role":"admin"')
        );
    });

    test('loginVerify should fail with bad response', async () => {
         const username = 'admin';
         const req = Auth.loginRequest({ username });
         
         await expect(Auth.loginVerify({
             username,
             challenge: req.challenge,
             response: 'wrong'
         })).rejects.toThrow('Authentication failed');
    });

    test('loginVerify should fail with invalid challenge', async () => {
         await expect(Auth.loginVerify({
             username: 'admin',
             challenge: 'non_existent',
             response: 'any'
         })).rejects.toThrow('Invalid or expired challenge');
    });

});
