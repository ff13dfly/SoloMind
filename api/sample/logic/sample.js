const Errors = require('./utils/errors');

module.exports = (redis) => ({
    async echo({ message }) {
        if (!message) throw Errors.MISSING_PARAM('message');
        return { 
            message: `Echo: ${message}`,
            timestamp: Date.now()
        };
    },

    async ping() {
        return { pong: true };
    }
});
