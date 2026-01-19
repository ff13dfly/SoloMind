/**
 * System Method Handlers
 * Handles system.add_service, system.get_logs and other Router-level system methods
 */

const fs = require('fs');
const path = require('path');

/**
 * Create system handlers with injected dependencies
 */
function createSystemHandlers(addServiceFn, isAdmin, dirname) {
    return {
        /**
         * system.add_service - Register new service
         */
        async addService(params, id, res) {
            try {
                const result = await addServiceFn(params.url);
                return res.json({ jsonrpc: '2.0', result, id });
            } catch (e) {
                return res.json({ jsonrpc: '2.0', error: { code: -32000, message: e.message }, id });
            }
        },

        /**
         * system.get_logs - Read router debug logs (Admin Only)
         */
        getLogs(params, id, res, isAdminUser) {
            if (!isAdminUser) {
                return res.json({ jsonrpc: '2.0', error: { code: -32604, message: 'Unauthorized' }, id });
            }
            
            const logPath = path.join(dirname, 'debug.log');
            if (!fs.existsSync(logPath)) {
                return res.json({ jsonrpc: '2.0', result: { logs: [], total: 0 }, id });
            }

            try {
                const pageSize = parseInt(params.pageSize) || 100;
                const page = parseInt(params.page) || 1;
                
                const logContent = fs.readFileSync(logPath, 'utf8');
                const linesArr = logContent.split('\n').filter(l => l !== '');
                const total = linesArr.length;
                
                const start = Math.max(0, total - page * pageSize);
                const end = Math.max(0, total - (page - 1) * pageSize);
                
                const resultLines = linesArr.slice(start, end);
                
                return res.json({ 
                    jsonrpc: '2.0', 
                    result: { 
                        logs: resultLines, 
                        total, 
                        page, 
                        pageSize,
                        pages: Math.ceil(total / pageSize)
                    }, 
                    id 
                });
            } catch (e) {
                return res.json({ jsonrpc: '2.0', error: { code: -32000, message: 'Failed to read logs: ' + e.message }, id });
            }
        },

        /**
         * system.get_interaction_logs - Retrieve analyzed user logs
         * Params: { userId: string, month: string (YYYYMM), limit: number }
         */
        async getInteractionLogs(params, id, res, isAdminUser) {
            if (!isAdminUser) {
                return res.json({ jsonrpc: '2.0', error: { code: -32604, message: 'Unauthorized' }, id });
            }

            try {
                // Dependency: We need the same logger utility used for writing
                const logger = require('../../sample/logic/utils/logger'); // Relative path from handlers/
                
                const { userId, month, limit } = params;
                if (!userId || !month) {
                    return res.json({ jsonrpc: '2.0', error: { code: -32602, message: 'Missing params: userId, month' }, id });
                }

                // Reconstruct the partition key logic: "userId_month"
                // Refer to api/router/index.js implementation
                const partitionKey = `${userId}_${month}`;
                const folder = path.join(dirname, 'logs/interactions'); // Resolve relative to router root (dirname)

                console.log(`[Handler Debug] userId: ${userId}, month: ${month}, partitionKey: ${partitionKey}`);
                console.log(`[Handler Debug] Resolving logs from absolute folder: ${folder}`);

                const logs = logger.query(partitionKey, folder, limit || 50);

                return res.json({ jsonrpc: '2.0', result: logs, id });
            } catch (e) {
                return res.json({ jsonrpc: '2.0', error: { code: -32000, message: e.message }, id });
            }
        }
    };
}

module.exports = { createSystemHandlers };
