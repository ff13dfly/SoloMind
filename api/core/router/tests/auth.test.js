const authHandlers = require('../handlers/auth');

// --- Mock Infrastructure ---
class MockRedisClient {
    constructor() {
        this.data = new Map();
        this.isOpen = true;
    }
    async get(key) { return this.data.get(key) || null; }
    set(key, val) { this.data.set(key, val); }
}

describe('Auth Handler', () => {
    
    describe('extractToken', () => {
        test('should extract from Authorization header', () => {
            const req = { headers: { 'authorization': 'Bearer token123' } };
            expect(authHandlers.extractToken(req)).toBe('token123');
        });

        test('should extract from x-admin-token header', () => {
            const req = { headers: { 'x-admin-token': 'adminSecret' } };
            expect(authHandlers.extractToken(req)).toBe('adminSecret');
        });

        test('should return null if no token found', () => {
             const req = { headers: {} };
             expect(authHandlers.extractToken(req)).toBeNull();
        });
    });

    describe('resolveSessionUser', () => {
        let mockRedis;

        beforeEach(() => {
            mockRedis = new MockRedisClient();
        });

        test('should return guest if no token provided', async () => {
             const user = await authHandlers.resolveSessionUser(null, mockRedis);
             expect(user.username).toBe('guest');
        });

        test('should return guest if redis not open', async () => {
             const user = await authHandlers.resolveSessionUser('token', null);
             expect(user.username).toBe('guest');
        });

        test('should return session user if found in redis', async () => {
             const session = { username: 'alice', permit: { allow_all: true } };
             mockRedis.set('session:validToken', JSON.stringify(session));
             
             const user = await authHandlers.resolveSessionUser('validToken', mockRedis);
             expect(user.username).toBe('alice');
             expect(user.permit.allow_all).toBe(true);
        });
        
        test('should normalize legacy admin role', async () => {
             const session = { username: 'admin', role: 'admin' }; // No permit
             mockRedis.set('session:legacyAdmin', JSON.stringify(session));
             
             const user = await authHandlers.resolveSessionUser('legacyAdmin', mockRedis);
             expect(user.permit.allow_all).toBe(true);
        });

        test('should normalize legacy permit string "admin"', async () => {
             const session = { username: 'admin', permit: 'admin' };
             mockRedis.set('session:strAdmin', JSON.stringify(session));
             
             const user = await authHandlers.resolveSessionUser('strAdmin', mockRedis);
             expect(user.permit.allow_all).toBe(true);
        });
    });

    describe('checkPermission', () => {
        const permit = {
            allow_all: false,
            services: {
                'crm': ['create', 'read'],
                'finance': ['*']
            }
        };

        test('should return true if allow_all is true', () => {
            expect(authHandlers.checkPermission({ allow_all: true }, 'any', 'any')).toBe(true);
        });

        test('should return false if permit is null', () => {
             expect(authHandlers.checkPermission(null, 'crm', 'read')).toBe(false);
        });

        test('should allow explicit method access', () => {
             expect(authHandlers.checkPermission(permit, 'crm', 'read')).toBe(true);
        });

        test('should deny unlisted method access', () => {
             expect(authHandlers.checkPermission(permit, 'crm', 'delete')).toBe(false);
        });

        test('should allow wildcard access', () => {
             expect(authHandlers.checkPermission(permit, 'finance', 'anything')).toBe(true);
        });

        test('should deny access to unlisted service', () => {
             expect(authHandlers.checkPermission(permit, 'hr', 'read')).toBe(false);
        });
    });

    describe('resolveTargetService', () => {
        const SERVICES = {
            'crm': { methods: [{ name: 'crm.create', params: [] }] },
            'user': { methods: [{ name: 'user.login', params: [] }] }
        };

        test('should find service by method name', () => {
             const result = authHandlers.resolveTargetService('crm.create', SERVICES);
             expect(result).not.toBeNull();
             expect(result.serviceName).toBe('crm');
        });

        test('should return null if method not found', () => {
             const result = authHandlers.resolveTargetService('unknown', SERVICES);
             expect(result).toBeNull();
        });
    });

});
