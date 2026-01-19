/**
 * Error Definitions for Sample Service
 */

module.exports = {
    // Standard JSON-RPC errors
    INVALID_PARAM: (message) => ({ code: -32602, message: message || 'Invalid parameters' }),
    MISSING_PARAM: (name) => ({ code: -32602, message: `Missing parameter: ${name}` }),
    
    // Business logic errors
    NOT_FOUND: (entity = 'Resource') => ({ code: -32002, message: `${entity} not found` }),
    ALREADY_EXISTS: (entity = 'Resource') => ({ code: -32001, message: `${entity} already exists` }),
    
    // Internal errors
    INTERNAL_ERROR: (message) => ({ code: -32603, message: message || 'Internal server error' })
};
