module.exports = [
    // Auth Methods (Public)
    { 
        name: 'login_request', 
        params: [{name: 'username', type: 'string'}], 
        description: 'Initiate login process', 
        ai: false, 
        public: true 
    },
    { 
        name: 'login_verify', 
        params: [{name: 'username', type: 'string'}, {name: 'challenge', type: 'string'}, {name: 'response', type: 'string'}], 
        description: 'Verify login challenge', 
        ai: false, 
        public: true 
    },
    // Also supporting namespaced versions if needed in future, but sticking to what's observed for now.
    
    // Admin Methods (Protected)
    { 
        name: 'admin.error.list', 
        params: [{name: 'service', type: 'string'}, {name: 'limit', type: 'number'}, {name: 'offset', type: 'number'}], 
        description: 'List service errors', 
        ai: true 
    },
    { 
        name: 'admin.error.clear', 
        params: [{name: 'service', type: 'string'}], 
        description: 'Clear service errors', 
        ai: true 
    }
];
