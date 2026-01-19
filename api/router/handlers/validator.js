/**
 * Parameter Validation Handler
 * Validates RPC request parameters against method schema
 */

/**
 * Validate parameters against method schema
 * @param {object} params - Request parameters
 * @param {Array} methodSchema - Method parameter schema from service
 * @returns {object|null} Error object if validation fails, null if valid
 */
function validateParams(params, methodSchema) {
    if (!methodSchema || !Array.isArray(methodSchema) || methodSchema.length === 0) {
        return null; // No schema, pass through
    }

    for (const item of methodSchema) {
        if (typeof item !== 'object' || !item.name) {
            continue;
        }

        const value = params[item.name];

        // Required check
        if (item.required && (value === undefined || value === null)) {
            return {
                code: -32602,
                message: `Invalid params: missing '${item.name}'`
            };
        }

        // Type check
        if (value !== undefined && value !== null && item.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== item.type) {
                return {
                    code: -32602,
                    message: `Invalid params: '${item.name}' should be ${item.type}`
                };
            }
        }
    }

    return null; // Validation passed
}

/**
 * Public methods whitelist for permission bypass
 */
const PUBLIC_METHODS = [
    'methods', // Introspection
    'system.capabilities', 'system.list_services', 'system.check_service_status'
];

/**
 * Check if method is public (bypasses permission check)
 * @param {string} method - Method name
 * @returns {boolean}
 */
function isPublicMethod(method) {
    return PUBLIC_METHODS.includes(method);
}

module.exports = {
    validateParams,
    isPublicMethod,
    PUBLIC_METHODS
};
