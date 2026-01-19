const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const config = require('./config');

// Handler Modules
const { createCategoryHandlers } = require('./handlers/category');
const { createServiceHandlers, addService, ensureAdministratorService } = require('./handlers/service');
const { createSystemHandlers } = require('./handlers/system');
const { validateParams } = require('./handlers/validator');
const { processTasks } = require('./handlers/tasks');
const { createDebugLogger } = require('./handlers/debugger');
const authHandlers = require('./handlers/auth');
const keypairHandler = require('./handlers/keypair');
const forwardHandler = require('./handlers/forward');
const permitHandler = require('./handlers/permit');
const capabilityHandler = require('./handlers/capability');
const bootstrap = require('./handlers/bootstrap');

// --- Global Error Handlers ---
process.on('uncaughtException', (err) => {
    console.error(chalk.red('Uncaught Exception:'), err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// --- App Setup ---
const app = express();
const PORT = config.port;

app.use(cors());
app.use(bodyParser.json({ limit: config.bodyLimit }));
app.use(createDebugLogger(config));

// --- State & Initialization ---
const SERVICES = {};
const CAPABILITY_MAP = capabilityHandler.CAPABILITY_MAP;
let redisClient;

// Keypair
keypairHandler.loadOrGenerateKeypair(config.debug);
const getKeypair = () => keypairHandler.getKeypair();

// Bootstrap (Redis & Services) - Now properly awaited
const updateCapabilityMap = async () => await capabilityHandler.updateCapabilityMap(SERVICES, redisClient);

// Async startup to ensure Redis is ready before accepting connections
(async () => {
    try {
        redisClient = await bootstrap.initializeRedis(SERVICES, updateCapabilityMap);
        
        // Default Administrator Service
        ensureAdministratorService(SERVICES, config.administratorServiceUrl);

        // Load hardcoded API returns data to enrich capability map
        capabilityHandler.loadApiReturns();

// --- Routes ---

// Public Key Endpoint
app.get('/auth/key', (req, res) => {
    if (!getKeypair()) return res.status(503).json({ error: 'Keypair not loaded' });
    res.json({ publicKey: getKeypair().publicKey.toBase58() });
});

// Health Check
app.get('/health', (req, res) => res.send('API Router OK'));

// JSON-RPC Handler
const rpcHandler = async (req, res) => {
    const { jsonrpc, method, params, id } = req.body;

    if (!jsonrpc || !method) {
        return res.status(400).json({ error: 'Invalid Request' });
    }

    // 1. System Handlers (Service Management)
    const serviceHandlers = createServiceHandlers(SERVICES, CAPABILITY_MAP, redisClient);
    
    if (method === 'system.add_service') {
        try {
            const result = await addService(params.url, SERVICES, redisClient, getKeypair(), CAPABILITY_MAP);
            return res.json({ jsonrpc: '2.0', result, id });
        } catch (e) {
            return res.json({ jsonrpc: '2.0', error: { code: -32000, message: e.message }, id });
        }
    }

    const systemMethods = {
        'system.check_service_status': (p, i, r) => serviceHandlers.checkServiceStatus(p, i, r),
        'system.capabilities': (p, i, r) => serviceHandlers.capabilities(i, r),
        'system.list_services': (p, i, r) => serviceHandlers.listServices(i, r),
        'system.remove_service': (p, i, r) => serviceHandlers.removeService(p, i, r),
        'system.workflow.published': async (p, i, r) => {
            try {
                const dataStr = await redisClient.get('AGENT:WORKFLOW_SNAPSHOT');
                const workflows = dataStr ? JSON.parse(dataStr) : [];
                return res.json({ jsonrpc: '2.0', result: workflows, id: i });
            } catch (e) {
                return res.json({ jsonrpc: '2.0', error: { code: -32000, message: 'Failed to fetch published workflows' }, id: i });
            }
        }
    };

    if (systemMethods[method]) {
        return await systemMethods[method](params, id, res);
    }

    // 2. System Handlers (Category)
    const categoryHandlers = createCategoryHandlers(redisClient, SERVICES);
    const categoryMethods = {
        'system.category.reserve': (p, i, r) => categoryHandlers.reserve(p, i, r),
        'system.category.delete': (p, i, r) => categoryHandlers.delete(p, i, r),
        'system.category.locate': (p, i, r) => categoryHandlers.locate(p, i, r),
        'system.category.list': (p, i, r) => categoryHandlers.list(p, i, r)
    };

    if (categoryMethods[method]) {
        return await categoryMethods[method](params, id, res);
    }

    // 3. System Handlers (Logs)
    if (method === 'system.get_logs' || method === 'system.get_interaction_logs') {
        const systemHandlers = createSystemHandlers(null, null, __dirname);
        const token = authHandlers.extractToken(req);
        const sessionUser = await authHandlers.resolveSessionUser(token, redisClient);
        const isAdmin = authHandlers.isAdmin(sessionUser);

        if (method === 'system.get_logs') {
            return systemHandlers.getLogs(params, id, res, isAdmin);
        }
        if (method === 'system.get_interaction_logs') {
             return systemHandlers.getInteractionLogs(params, id, res, isAdmin);
        }
    }

    // 4. Authentication & Resolution
    const token = authHandlers.extractToken(req);
    const sessionUser = await authHandlers.resolveSessionUser(token, redisClient);
    const isAdmin = authHandlers.isAdmin(sessionUser);
    
    // Normalize identifiers for logging and downstream use
    const userId = sessionUser.uid || sessionUser.id || sessionUser.name || sessionUser.username || 'anonymous';

    const resolved = authHandlers.resolveTargetService(method, SERVICES);
    let { service: targetService, serviceName: targetServiceName, methodSchema } = resolved || {};

    // 5. Permission Check
    const access = permitHandler.checkAccess(sessionUser, targetServiceName, method);
    if (!access.allowed) {
        // Log interaction (ACCESS DENIED)
        logInteraction(userId, method, params, permitHandler.createForbiddenError(id), sessionUser);
        return res.json(permitHandler.createForbiddenError(id));
    }

    // 6. Parameter Validation
    const enrichedParams = { ...params };
    if (targetService && methodSchema) {
        const validationError = validateParams(enrichedParams, methodSchema);
        if (validationError) {
            return res.json({ jsonrpc: '2.0', error: validationError, id });
        }
    }

    // Fallback
    if (!targetService) {
        targetService = SERVICES.administrator;
    }

    // 7. Forwarding & Execution
    try {
        const responseData = await forwardHandler.forwardRequest({
            targetService,
            method,
            params: enrichedParams,
            jsonrpc,
            id,
            sessionUser,
            isAdmin,
            keypair: getKeypair(),
            debug: config.debug,
            sourceHeaders: req.headers
        });

        // Intercept Tasks
        const tasks = forwardHandler.extractTasks(responseData);
        if (tasks) {
            processTasks(tasks, userId, isAdmin, SERVICES, getKeypair(), redisClient)
                .catch(err => console.error(chalk.red('[Router] Task processing failed:'), err));
        }

        // --------------------------------
        
        res.json(responseData);
        
        // Log interaction (SUCCESS/FALLBACK)
        if (method.startsWith('agent.')) {
            logInteraction(userId, method, params, responseData, sessionUser);
        }
    } catch (err) {
        console.error(chalk.red(`[Router] Request to ${targetService.url} failed:`), err.message);
        await forwardHandler.logUpstreamError(err, params, redisClient);
        const errorResponse = forwardHandler.createUpstreamError(err.message, id);
        res.status(502).json(errorResponse);
        
        // Log interaction (ERROR)
        if (method.startsWith('agent.')) {
            logInteraction(userId, method, params, errorResponse, sessionUser);
        }
    }
};

/**
 * Async User Interaction Logging
 */
function logInteraction(userId, method, params, response, sessionUser) {
    (async () => {
        try {
            const logger = require('../sample/logic/utils/logger');
            const now = new Date();
            const currentMonth = now.toISOString().slice(0, 7).replace('-', '');
            const partitionKey = `${userId}_${currentMonth}`;

            let prompt = "UNKNOWN_INPUT";
            if (params.text) prompt = params.text;
            else if (params.image) prompt = `[Image: ${(params.image.length/1024).toFixed(2)}KB]`;
            else if (params.audio) prompt = `[Audio: ${(params.audio.length/1024).toFixed(2)}KB]`;
            else if (params.user_input) prompt = params.user_input;

            let status = "SUCCESS";
            if (response.error) {
                status = "ERROR";
            } else if (response.result && response.result.type === 'fallback') {
                status = "FALLBACK";
            } else if (response.error && response.error.code === -32003) { // Forbidden error code
                status = "ACCESS_DENIED";
            }

            const record = {
                prompts: prompt,
                method: method,
                stamp: now.getTime(),
                answer: response.result || response.error,
                status: status
            };

            logger.insert(partitionKey, record, 'logs/interactions');
        } catch (e) {
            console.warn(`[Router] Interaction Log Failed for ${sessionUser.name || sessionUser.username || sessionUser.uid || 'guest'} to ${method}:`, e.message);
        }
    })();
}

app.post('/api/rpc', rpcHandler);

        // Start server only after Redis is ready
        app.listen(PORT, () => {
            console.log(chalk.green(`API Router running on port ${PORT}`));
        });
    } catch (err) {
        console.error(chalk.red('[Router] Startup failed:'), err);
        process.exit(1);
    }
})();
