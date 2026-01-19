const Handlers = require('../handlers');

// Mock Redis
const mockRedisClient = {
    lRange: jest.fn(),
    del: jest.fn()
};

describe('Administrator System Handlers', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('errorList', () => {
        test('should list errors for service', async () => {
            const logs = [JSON.stringify({ msg: 'err1' }), JSON.stringify({ msg: 'err2' })];
            mockRedisClient.lRange.mockResolvedValue(logs);

            const res = await Handlers.errorList(mockRedisClient, { service: 'router' });
            
            expect(res.service).toBe('router');
            expect(res.logs).toHaveLength(2);
            expect(res.logs[0].msg).toBe('err1');
        });

        test('should fail without service name', async () => {
             await expect(Handlers.errorList(mockRedisClient, {}))
                .rejects.toEqual(expect.objectContaining({ code: -32602 }));
        });
    });

    describe('errorClear', () => {
        test('should clear errors if admin', async () => {
            mockRedisClient.del.mockResolvedValue(1);
            
            const res = await Handlers.errorClear(mockRedisClient, { 
                service: 'router', 
                isAdmin: true 
            });
            
            expect(res.success).toBe(true);
            expect(mockRedisClient.del).toHaveBeenCalledWith('ERROR:QUEUE:router');
        });

        test('should deny if not admin', async () => {
             await expect(Handlers.errorClear(mockRedisClient, { 
                 service: 'router', 
                 isAdmin: false 
             })).rejects.toEqual(expect.objectContaining({ code: -403 }));
        });
    });

});
