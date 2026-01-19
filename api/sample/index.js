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

const SERVICE_NAME = 'sample';
const SERVICE_VERSION = '1.0.0';
const STARTUP_TIME = new Date().toISOString();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
    if (config.debug) {
        console.log(chalk.blue(`[${SERVICE_NAME}] INCOMING:`), chalk.green(req.method), req.originalUrl);
    }
    next();
});

let redisClient;
let Methods;

// Bootstrap
(async () => {
    try {
        redisClient = await initializeRedis(SERVICE_NAME);
        await ensureDefaultCategories(redisClient, SERVICE_NAME);
        Methods = createLogic(redisClient, { serviceName: SERVICE_NAME });
        
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
app.get('/auth/seed', authHandlers.handleSeed);
app.post('/auth/verify', (req, res) => authHandlers.handleVerify(req, res, SERVICE_NAME, SERVICE_VERSION, STARTUP_TIME));

// --- JSON-RPC Endpoint ---
app.post('/jsonrpc', async (req, res) => {
    if (!Methods) return res.status(503).json({ error: 'Service not ready' });

    const { jsonrpc, method, params, id } = req.body;
    
    try {
        let result;

        // Routing Logic
        if (method === 'sample.echo') {
            result = await Methods.sample.echo(params);
        } else if (method === 'sample.ping') {
            result = await Methods.sample.ping();
        }
        // Standard health check (required by Router)
        else if (method === 'ping') {
            result = { status: 'ok', service: SERVICE_NAME, version: SERVICE_VERSION, uptime: STARTUP_TIME };
        } 
        // Category
        else if (method.startsWith('sample.category.')) {
            if (method === 'sample.category.create') result = await Methods.category.create(params);
            else if (method === 'sample.category.update') result = await Methods.category.update(params);
            else if (method === 'sample.category.delete') result = await Methods.category.delete(params);
            else if (method === 'sample.category.list') result = await Methods.category.list(params);
            else if (method === 'sample.category.get') result = await Methods.category.get(params);
            
            else if (method === 'sample.category.item.add') result = await Methods.category.itemAdd(params);
            else if (method === 'sample.category.item.update') result = await Methods.category.itemUpdate(params);
            else if (method === 'sample.category.item.remove') result = await Methods.category.itemRemove(params);
        }
        // Introspection
        else if (method === 'methods') {
            result = introspectionMethods;
        }
        // Entities
        else if (method === 'sample.entities' || method === 'entities') {
            result = require('./handlers/entities');
        }

        if (result === undefined) {
            throw new Error(`Method ${method} not found`);
        }

        res.json({ jsonrpc: '2.0', result, id });
    } catch (err) {
        console.error(chalk.red(`[${SERVICE_NAME}] Error:`), err.message);
        
        // Error Logging
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
        } catch (e) { console.error('Log failed', e); }

        res.json({ jsonrpc: '2.0', error: { code: err.code || -32603, message: err.message }, id });
    }
});
