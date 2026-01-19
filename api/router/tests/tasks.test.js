const axios = require('axios');
const tweetnacl = require('tweetnacl');
const { processTasks } = require('../handlers/tasks');

jest.mock('axios');

class MockRedisClient {
    constructor() { this.store = []; this.isOpen = true; }
    async rPush(key, val) { this.store.push(val); }
}

describe('Tasks Handler', () => {

    let SERVICES;
    let mockRedis;
    const keypair = {
        publicKey: { toBase58: () => 'pk' },
        secretKey: new Uint8Array(64)
    };

    beforeEach(() => {
        mockRedis = new MockRedisClient();
        SERVICES = {
            'gateway': { url: 'http://gateway' },
            'finance': { url: 'http://finance' }
        };
        jest.clearAllMocks();
    });

    test('should execute allowed tasks', async () => {
         const tasks = [
             { service: 'gateway', method: 'notify', params: { msg: 'hi' } }
         ];

         axios.post.mockResolvedValueOnce({});

         await processTasks(tasks, 'user1', false, SERVICES, keypair, mockRedis);

         expect(axios.post).toHaveBeenCalledTimes(1);
         expect(axios.post).toHaveBeenCalledWith(
             'http://gateway', 
             expect.objectContaining({ method: 'notify' }),
             expect.any(Object)
         );
    });

    test('should block forbidden services', async () => {
         // 'finance' is NOT in ALLOWED_SERVICES list in tasks.js source code
         const tasks = [
             { service: 'finance', method: 'pay', params: { amt: 100 } }
         ];

         await processTasks(tasks, 'user1', true, SERVICES, keypair, mockRedis);
         
         expect(axios.post).not.toHaveBeenCalled();
    });

    test('should skip unknown services', async () => {
         const tasks = [
             { service: 'log', method: 'write', params: {} } // 'log' is allowed but not in our SERVICES map
         ];

         await processTasks(tasks, 'user1', true, SERVICES, keypair, mockRedis);
         
         expect(axios.post).not.toHaveBeenCalled();
    });

    test('should log errors to redis', async () => {
         const tasks = [
             { service: 'gateway', method: 'notify', params: {} }
         ];
         
         axios.post.mockRejectedValueOnce(new Error('Connect failed'));

         await processTasks(tasks, 'user1', false, SERVICES, keypair, mockRedis);
         
         expect(mockRedis.store.length).toBe(1);
         const log = JSON.parse(mockRedis.store[0]);
         expect(log.code).toBe('TASK_ERROR');
         expect(log.error).toBe('Connect failed');
    });

});
