const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const bs58 = require('bs58').default || require('bs58');
const tweetnacl = require('tweetnacl');
const { PublicKey } = require('@solana/web3.js');
const { createClient } = require('redis');
const config = require('./config');
const rpcMethods = require('./rpc_registry');
const introspectionMethods = require('./handlers/introspection');
const auth = require('./logic/auth'); // Updated path
const axios = require('axios');

const app = express();
const PORT = config.port;

// Initialize Auth (Redis connection and housekeeping)
auth.init();

const chalk = require('chalk');

app.use(cors());
app.use(bodyParser.json());

// Debug Logger
app.use((req, res, next) => {
    if (config.debug) {
        console.log(chalk.blue('[Admin] INCOMING:'), chalk.green(req.method), req.originalUrl);
        if (req.body) {
             console.log(chalk.gray('[Admin] BODY:'), JSON.stringify(req.body, null, 2));
        }
        
        const oldJson = res.json;
        res.json = function(data) {
            console.log(chalk.blue('[Admin] OUTGOING:'), chalk.cyan(JSON.stringify(data, null, 2)));
            return oldJson.apply(res, arguments);
        };
    }
    next();
});

// --- LEVEL 3 SECURITY: KEY MANAGEMENT & AUTH ---
let ROUTER_PUBLIC_KEY = config.routerPublicKey; // Usually undefined in old config

// Auto-discovery of Router Key
if (!ROUTER_PUBLIC_KEY || ROUTER_PUBLIC_KEY === 'REPLACE_WITH_ROUTER_PUBLIC_KEY') {
    console.log('[Admin] Router Public Key not configured. Attempting auto-discovery from Router...');
    setTimeout(async () => {
         try {
             // Assuming Router is on port 3600
             const res = await axios.get(`${config.routerUrl}/auth/key`);
             if (res.data.publicKey) {
                 ROUTER_PUBLIC_KEY = res.data.publicKey;
                 console.log(chalk.green('[Admin] Successfully fetched Router Public Key:'), ROUTER_PUBLIC_KEY);
             }
         } catch(e) { 
             console.error('[Admin] Failed to fetch router key.', e.message); 
         }
    }, 2000);
}

// Middleware: Strict Router Authorization
const verifyRouterAuth = async (req, res, next) => {
    if (req.path.startsWith('/auth') || req.path === '/health') return next();
    
    // Exclude public methods
    if (req.body && (
        req.body.method === 'methods' ||
        req.body.method === 'login_request' || 
        req.body.method === 'login_verify' ||
        req.body.method === 'auth.login.request' || 
        req.body.method === 'auth.login.verify'
    )) return next();

    const tokenB58 = req.headers['x-router-token'];
    const sigB58 = req.headers['x-router-signature'];
    
    if (!tokenB58 || !sigB58) {
         // Strict Level 3: Reject unauthenticated requests
         return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Level 3: Missing Auth Headers' }, id: req.body?.id });
    }
    
    if (!ROUTER_PUBLIC_KEY) {
         return res.status(503).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Router Trust Anchor Not Configured' }, id: req.body?.id });
    }

    try {
        const payloadBytes = bs58.decode(tokenB58);
        const signatureBytes = bs58.decode(sigB58);
        const publicKeyBytes = new PublicKey(ROUTER_PUBLIC_KEY).toBytes();
        
        if (tweetnacl.sign.detached.verify(payloadBytes, signatureBytes, publicKeyBytes)) {
            const payloadStr = new TextDecoder().decode(payloadBytes);
            const payload = JSON.parse(payloadStr);
            
            // Inject Verified Identity
            req.user = payload; 
            
            if (config.debug) {
                console.log(chalk.magenta('[Admin] Verified Router Request for User:'), payload.user, 'Permit:', payload.permit);
            }
            next();
        } else {
             return res.status(403).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Invalid Router Signature' }, id: req.body?.id });
        }
    } catch (e) {
        console.error('Auth Verification Error', e);
         return res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Malformed Auth Token' }, id: req.body?.id });
    }
};

app.use(verifyRouterAuth);

// JSON-RPC 2.0 Endpoint
app.post('/jsonrpc', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== '2.0') {
    return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: null });
  }

  if (method === 'methods') {
      return res.json({ jsonrpc: '2.0', result: introspectionMethods, id });
  }

  const rpcMethod = rpcMethods[method];

  if (!rpcMethod) {
    return res.json({ jsonrpc: '2.0', error: { code: -32601, message: 'Method not found' }, id });
  }

  try {
    // Level 3 Authorization Injection
    // We trust req.user because strict middleware verified the signature from Router.
    // We inject this trusted identity into params for backward compatibility with internal methods.
    const trustedParams = { ...params };
    
    // Fix: Handle permit as object or string (consistent with api/user)
    if (req.user && (req.user.permit?.allow_all === true || req.user.permit === 'admin')) {
        trustedParams.isAdmin = true;
    }
    
    // Also inject the user object if methods need it
    trustedParams._user = req.user;

    const result = await rpcMethod.handler(trustedParams);
    res.json({ jsonrpc: '2.0', result, id });
  } catch (error) {
    console.error(`RPC Error [${method}]:`, error.message);

    // Error Logging
    const errorLog = {
        code: error.code || 'INTERNAL_ERROR',
        error: error.message,
        request: params,
        stamp: new Date().toISOString()
    };
    try {
        const rc = auth.getRedisClient();
        if (rc && rc.isOpen) await rc.rPush('ERROR:QUEUE:administrator', JSON.stringify(errorLog));
    } catch (e) { console.error('Log failed', e); }

    res.json({ jsonrpc: '2.0', error: { code: -32000, message: error.message }, id });
  }
});

app.get('/health', (req, res) => {
  res.send('Administrator Service OK');
});

// For backward compatibility
app.get('/', (req, res) => {
  res.send('JSON-RPC 2.0 Endpoint at /jsonrpc');
});

app.listen(PORT, () => {
  console.log(`Administrator Service running on port ${PORT}`);
});
