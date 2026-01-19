const errorLogic = require('../logic/error');

const AdminHandlers = {
    async errorList(redisClient, params) {
        return await errorLogic.list(redisClient, params);
    },

    async errorClear(redisClient, params) {
        return await errorLogic.clear(redisClient, params);
    }
};

module.exports = AdminHandlers;
