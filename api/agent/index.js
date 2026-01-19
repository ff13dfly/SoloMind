require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const crypto = require('crypto');
const redis = require('redis');
const bs58 = require('bs58').default || require('bs58');
const tweetnacl = require('tweetnacl');
const { PublicKey } = require('@solana/web3.js');

const config = require('./config');
const Methods = require('./lib/methods');

const app = express();
const PORT = config.port;

// Service Startup Time
const STARTUP_TIME = new Date().toISOString();

app.use(cors());
app.use(bodyParser.json({ limit: config.bodyLimit }));

// Redis Client
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log(chalk.red('[Agent] Redis Client Error'), err));
redisClient.connect().catch(console.error);

// Request Logger
app.use((req, res, next) => {
    if (config.debug) {
        console.log(chalk.blue('[Agent] INCOMING:'), chalk.green(req.method), req.originalUrl);
    }
    next();
});

// --- State ---
const PENDING_SEEDS = new Map(); // seed -> timestamp
const ACTIVE_SESSIONS = new Map(); // publicKey -> { timestamp, expiresAt }

// Cleanup interval (every minute)
setInterval(() => {
    const now = Date.now();
    for (const [seed, ts] of PENDING_SEEDS) {
        if (now - ts > 60000) PENDING_SEEDS.delete(seed); // 1 min seed validity
    }
    for (const [pk, session] of ACTIVE_SESSIONS) {
        if (now > session.expiresAt) ACTIVE_SESSIONS.delete(pk);
    }
}, 60000);

// --- Auth Endpoints ---
app.get('/auth/seed', (req, res) => {
    const seed = crypto.randomBytes(32).toString('hex');
    PENDING_SEEDS.set(seed, Date.now());
    res.json({ seed });
});

app.post('/auth/verify', (req, res) => {
    const { signature, publicKey } = req.body;
    
    if (!signature || !publicKey) {
        return res.status(400).json({ success: false, error: 'Missing params' });
    }

    // Verify Signature against pending seeds
    let validSeed = null;
    try {
        const signatureBytes = bs58.decode(signature);
        const publicKeyBytes = new PublicKey(publicKey).toBytes();

        for (const [seed, ts] of PENDING_SEEDS) {
            const message = new TextEncoder().encode(seed);
            if (tweetnacl.sign.detached.verify(message, signatureBytes, publicKeyBytes)) {
                validSeed = seed;
                break;
            }
        }
    } catch (e) {
        console.error(chalk.red('[Agent] Verification Error:'), e.message);
        return res.status(400).json({ success: false, error: 'Invalid Format' });
    }

    if (validSeed) {
        PENDING_SEEDS.delete(validSeed);
        
        // Track Session (Link)
        ACTIVE_SESSIONS.set(publicKey, {
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24h
        });
        
        console.log(chalk.green(`[Agent] Link established with: ${publicKey}`));
        return res.json({ 
            success: true, 
            serviceName: 'agent',
            version: '1.0.0',
            startupTime: STARTUP_TIME
        });
    } else {
        return res.status(401).json({ success: false, error: 'Invalid Signature or Expired Seed' });
    }
});

// --- JSON-RPC Endpoint ---
app.post('/jsonrpc', async (req, res) => {
    const { jsonrpc, method, params, id } = req.body;
    
    // Optional: Check active session if strict security is needed
    // const authHeader = req.headers['x-router-signature']; 
    
    try {
        let result;
        if (method === 'agent.image.parse') {
            result = await Methods.agent.image.parse(params);
        } else if (method === 'agent.audio.transcribe') {
            result = await Methods.agent.audio.transcribe(params);
        } else if (method === 'agent.text.parse') {
            result = await Methods.agent.text.parse(params);
        } else if (method === 'agent.chat') {
            result = await Methods.agent.chat(params);
        } else if (method === 'agent.purpose') {
            result = await Methods.agent.purpose(params);
        } else if (method === 'agent.focus') {
            result = await Methods.agent.focus(params);
        } else if (method === 'agent.cases') {
            result = await Methods.agent.cases(params);
        } else if (method === 'agent.hello') {
            result = "Hello from Agent Service";
        } else if (method === 'methods') {
             // Introspection
            result = [
                { name: 'agent.image.parse', params: [{name:'image', type:'string'}, {name:'model', type:'string', optional:true}], returns: ["intent", "entities", "description"], description: 'Parse image', ai: true },
                { name: 'agent.audio.transcribe', params: [{name:'audio', type:'string'}, {name:'model', type:'string', optional:true}], returns: ["text", "language"], description: 'Transcribe audio', ai: true },
                { name: 'agent.text.parse', params: [{name:'text', type:'string'}, {name:'model', type:'string', optional:true}], returns: ["intent", "entities", "confidence"], description: 'Parse text', ai: true },
                { name: 'agent.chat', params: [{name:'text', type:'string'}, {name:'model', type:'string', optional:true}], returns: ["response", "history", "usage"], description: 'Chat with AI', ai: true },
                { name: 'agent.purpose', params: [{name:'text', type:'string', optional:true}, {name:'image', type:'string', optional:true}], returns: ["intent", "confidence", "reason"], description: 'Identify intent', ai: true },
                { name: 'agent.focus', params: [{name:'workflow_id', type:'string'}, {name:'current_params', type:'object'}, {name:'missing_fields', type:'array'}, {name:'user_input', type:'string'}], returns: ["workflow_id", "current_params", "missing_fields", "response"], description: 'Focus mode parameter extraction', ai: true },
                { name: 'agent.cases', params: [{name:'workflow_id', type:'string'}, {name:'count', type:'number', optional:true}], description: 'Generate test cases for workflow', ai: true },
                { name: 'agent.hello', params: [], description: 'Health check', ai: true }
            ];
        } else {
            throw new Error(`Method ${method} not found`);
        }

        res.json({ jsonrpc: '2.0', result, id });
    } catch (err) {
        console.error(chalk.red('[Agent] Error:'), err.message);
        
        // Error Logging
        const errorLog = {
            code: err.code || 'INTERNAL_ERROR',
            error: err.message,
            request: params,
            stamp: new Date().toISOString()
        };
        try {
            if (redisClient && redisClient.isOpen) await redisClient.rPush('ERROR:QUEUE:agent', JSON.stringify(errorLog));
        } catch (e) { console.error('Log failed', e); }

        res.json({ jsonrpc: '2.0', error: { code: -32603, message: err.message }, id });
    }
});

app.listen(PORT, () => {
    console.log(chalk.magenta(`[Agent] Service running on port ${PORT}`));
    console.log(chalk.gray(`[Agent] Ready to accept connections.`));
});
