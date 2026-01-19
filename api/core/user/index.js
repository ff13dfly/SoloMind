const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const config = require('./config');

const { initializeRedis, ensureDefaultCategories } = require('./handlers/bootstrap');
const authHandlers = require('./handlers/auth');
const introspectionMethods = require('./handlers/introspection');
const createLogic = require('./logic');

const app = express();
const PORT = config.port;

const SERVICE_NAME = 'user';
const SERVICE_VERSION = config.version || '1.0.0';
const STARTUP_TIME = new Date().toISOString();

app.use(cors());
app.use(bodyParser.json());

// Request Logger
app.use((req, res, next) => {
    if (config.debug) {
        console.log(chalk.blue(`[${SERVICE_NAME}] INCOMING:`), chalk.green(req.method), req.originalUrl);
    }
    next();
});

// Middleware: Level 3 Security (Router Auth)
app.use(authHandlers.middleware);

let redisClient;
let Methods;

// Bootstrap
(async () => {
    try {
        redisClient = await initializeRedis(SERVICE_NAME);
        await ensureDefaultCategories(redisClient);
        
        Methods = createLogic(redisClient, config, { serviceName: SERVICE_NAME });
        
        // Start Server
        app.listen(PORT, () => {
            console.log(chalk.magenta(`[${SERVICE_NAME}] Service running on port ${PORT}`));
            console.log(chalk.gray(`[${SERVICE_NAME}] Ready to accept connections.`));
        });
    } catch (e) {
        console.error(chalk.red(`[${SERVICE_NAME}] Startup Failed:`), e);
        process.exit(1);
    }
})();

// --- Auth Endpoints ---
app.get('/health', (req, res) => res.send('OK'));
app.get('/auth/seed', authHandlers.handleSeed);
app.post('/auth/verify', (req, res) => authHandlers.handleVerify(req, res, SERVICE_NAME, SERVICE_VERSION, STARTUP_TIME));

// --- JSON-RPC Endpoint ---
app.post('/jsonrpc', async (req, res) => {
    if (!Methods) return res.status(503).json({ error: 'Service not ready' });

    const { jsonrpc, method, params, id } = req.body;
    
    // Auth context from middleware
    const isAdmin = req.user?.permit?.allow_all === true || req.user?.permit === 'admin';
    const context = { isAdmin, user: req.user };

    try {
        let result;

        // Routing Logic
        // 1. User Domain
        if (method === 'user.register') {
            result = await Methods.user.register(params);
        } else if (method === 'user.login_request') {
            result = await Methods.user.loginRequest(params);
        } else if (method === 'user.login_verify') {
            result = await Methods.user.loginVerify(params);
        } else if (method === 'user.profile') {
            result = await Methods.user.getProfile(params);
        } else if (method === 'user.list') {
            if (!isAdmin) throw { code: -32604, message: 'Unauthorized' };
            result = await Methods.user.list(params);
        } else if (method === 'user.get_status') {
            const status = await Methods.user.getStatus();
            result = {
                service: SERVICE_NAME,
                version: SERVICE_VERSION,
                startupTime: STARTUP_TIME,
                ...status,
                auth: req.user
            };
        } else if (method === 'user.permit.update') {
            if (!isAdmin) throw { code: -32604, message: 'Unauthorized' };
            result = await Methods.user.updatePermit(params);
        } else if (method === 'user.permit.get') {
            if (!isAdmin) throw { code: -32604, message: 'Unauthorized' };
            result = await Methods.user.getPermit(params);
        } else if (method === 'user.permit.batch') {
            if (!isAdmin) throw { code: -32604, message: 'Unauthorized' };
            result = await Methods.user.batchPermits(params);
        }
        
        // 2. Category Domain
        else if (method.startsWith('user.category.')) {
            // Mapping: user.category.* -> Methods.category.*
            if (method === 'user.category.create') result = await Methods.category.create(params);
            else if (method === 'user.category.update') result = await Methods.category.update(params);
            else if (method === 'user.category.delete') result = await Methods.category.delete(params);
            else if (method === 'user.category.list') result = await Methods.category.list(params);
            else if (method === 'user.category.get') result = await Methods.category.get(params);
            
            else if (method === 'user.category.item.add') result = await Methods.category.itemAdd(params);
            else if (method === 'user.category.item.update') result = await Methods.category.itemUpdate(params);
            else if (method === 'user.category.item.remove') result = await Methods.category.itemRemove(params);
        }
        
        // 4. User Generic Update / Remove / Restore / Destroy
        else if (method === 'user.update' || method === 'user.user.update') {
             if (!isAdmin) throw { code: -32604, message: 'Unauthorized' };
             result = await Methods.user.update(params);
        }
        else if (method === 'user.remove' || method === 'user.user.remove' || method === 'user.delete' || method === 'user.user.delete') {
             if (!isAdmin) throw { code: -32604, message: 'Unauthorized' };
             const id = params.id || params.uid;
             result = await Methods.user.remove({ id });
        }
        else if (method === 'user.restore' || method === 'user.user.restore') {
             if (!isAdmin) throw { code: -32604, message: 'Unauthorized' };
             const id = params.id || params.uid;
             result = await Methods.user.restore({ id });
        }
        else if (method === 'user.checkDestroyable' || method === 'user.user.checkDestroyable') {
             if (!isAdmin) throw { code: -32604, message: 'Unauthorized' };
             const id = params.id || params.uid;
             result = await Methods.user.checkDestroyable({ id });
        }
        else if (method === 'user.destroy' || method === 'user.user.destroy') {
             if (!isAdmin) throw { code: -32604, message: 'Unauthorized' };
             const id = params.id || params.uid;
             result = await Methods.user.destroy({ id });
        }
        
        // 5. Introspection
        else if (method === 'methods') {
            result = introspectionMethods;
        }

        if (result === undefined) {
            throw new Error(`Method ${method} not found`);
        }

        res.json({ jsonrpc: '2.0', result, id });
    } catch (err) {
        console.error(chalk.red(`[${SERVICE_NAME}] Error:`), err.message || err);
        
        // Log to Redis if possible
        const errorLog = {
            code: err.code || 'INTERNAL_ERROR',
            error: err.message,
            request: params,
            stamp: new Date().toISOString()
        };
        try {
            if (redisClient && redisClient.isOpen) {
                await redisClient.rPush(`ERROR:QUEUE:${SERVICE_NAME}`, JSON.stringify(errorLog));
            }
        } catch (e) { }

        res.json({ jsonrpc: '2.0', error: { code: err.code || -32603, message: err.message || 'Internal Error' }, id });
    }
});
