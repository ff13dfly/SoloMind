const ErrorLogic = {
    async list(redisClient, params) {
        const { service, limit = 50, offset = 0 } = params;
        if (!service) throw { code: -32602, message: 'Missing service name' };

        const key = `ERROR:QUEUE:${service}`;
        try {
            const logs = await redisClient.lRange(key, offset, offset + limit - 1);
            return { service, logs: logs.map(l => JSON.parse(l)) };
        } catch (err) {
            console.error(err);
            throw { code: -32603, message: 'Failed to list errors' };
        }
    },

    async clear(redisClient, params) {
        const { service } = params;
        if (!service) throw { code: -32602, message: 'Missing service name' };
        
        // Permission check is usually done in the handler or middleware, 
        // but keeping the specific isAdmin check here if passed down, 
        // or relying on the caller to check permissions.
        // The original checks params.isAdmin
        
        if (!params.isAdmin) {
             throw { code: -403, message: 'Admin privileges required' };
        }

        try {
            await redisClient.del(`ERROR:QUEUE:${service}`);
            return { success: true, service };
        } catch (err) {
            console.error(err);
            throw { code: -32603, message: 'Failed to clear errors' };
        }
    }
};

module.exports = ErrorLogic;
