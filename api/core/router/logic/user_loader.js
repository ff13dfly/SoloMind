/**
 * User Loader Logic
 * 
 * Responsibilities:
 * Centralized fetching of User Profile, Role, Permissions, and Preferences.
 * Serving as the single source of truth for User Context injection.
 */

const config = require('../config');

// Mock DB/Redis calls for now, integration with actual User Service via RPC/Redis later
const MOCK_USER_DB = {
    '1001': { 
        id: '1001', 
        name: 'ZhangSan', 
        role: 'warehouse_manager', 
        language: 'zh',
        permissions: ['asset.read', 'asset.write', 'asset.audit']
    },
    '1002': { 
        id: '1002', 
        name: 'JohnDoe', 
        role: 'finance_staff', 
        language: 'en',
        permissions: ['finance.approve', 'finance.read']
    }
};

class UserLoader {
    /**
     * Load User Context by ID
     * @param {string} userId 
     * @returns {Promise<Object>} User Context Object
     */
    static async load(userId) {
        // In real world: 
        // 1. Get basic info from redis:user:{id}
        // 2. Get permissions from rbac:{id}
        // For now, return mock
        const user = MOCK_USER_DB[userId];
        
        const defaultLang = config.defaultLanguage || 'zh';

        if (!user) {
            // Return Guest/Default
            return {
                id: userId,
                name: 'Guest',
                role: 'guest',
                language: defaultLang,
                permissions: []
            };
        }

        // Apply fallback if user has no language set
        if (!user.language) {
            user.language = defaultLang;
        }

        return user;
    }
}

module.exports = UserLoader;
