const auth = require('./auth');
const handlers = require('./handlers');

// Helper to wrap methods with redis client
const withRedis = (method) => async (params) => {
    const redisClient = auth.getRedisClient();
    if (!redisClient || !redisClient.isOpen) {
        throw { code: -32000, message: 'Database not ready' };
    }
    return method(redisClient, params);
};

const methods = {
  ping: {
    handler: () => 'pong',
    params: [],
    ai: false
  },
  methods: {
    handler: () => {
      return Object.keys(module.exports).map(name => ({
        name,
        params: module.exports[name].params,
        ai: module.exports[name].ai || false,
        public: module.exports[name].public || false
      }));
    },
    params: [],
    ai: false,
    public: true
  },
  login_request: {
    handler: auth.loginRequest,
    params: [
      { name: 'username', type: 'string', required: true }
    ],
    ai: false,
    public: true
  },
  login_verify: {
    handler: auth.loginVerify,
    params: [
      { name: 'username', type: 'string', required: true },
      { name: 'challenge', type: 'string', required: true },
      { name: 'response', type: 'string', required: true }
    ],
    ai: false,
    public: true
  },
  
  // Error Management (System)
  'administrator.error.list': {
      handler: withRedis(handlers.errorList),
      params: [{name: 'service', type: 'string'}],
      ai: true
  },
  'administrator.error.clear': {
      handler: withRedis(handlers.errorClear),
      params: [{name: 'service', type: 'string'}],
      ai: true
  }
};

module.exports = methods;
