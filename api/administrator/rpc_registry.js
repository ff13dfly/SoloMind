const adminHandlers = require('./handlers/admin');
const authLogic = require('./logic/auth');

module.exports = {
    'admin.error.list': {
        handler: async (params) => {
            return await adminHandlers.errorList(authLogic.getRedisClient(), params);
        }
    },
    'admin.error.clear': {
         handler: async (params) => {
            return await adminHandlers.errorClear(authLogic.getRedisClient(), params);
        }
    },
    // Matches observations from logs
    'login_request': {
        handler: async (params) => {
            return authLogic.loginRequest(params);
        }
    },
    'login_verify': {
        handler: async (params) => {
            return await authLogic.loginVerify(params);
        }
    },
    // Aliases for consistency if needed later
    'auth.login.request': {
        handler: async (params) => authLogic.loginRequest(params)
    },
    'auth.login.verify': {
        handler: async (params) => await authLogic.loginVerify(params)
    }
};
