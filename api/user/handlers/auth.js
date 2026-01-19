const crypto = require('crypto');
const bs58 = require('bs58').default || require('bs58');
const tweetnacl = require('tweetnacl');
const { PublicKey } = require('@solana/web3.js');
const chalk = require('chalk');
const axios = require('axios');
const config = require('../config');

// Constants
const PENDING_SEEDS = new Map();
const ACTIVE_SESSIONS = new Map();

let ROUTER_PUBLIC_KEY = config.routerPublicKey;

// Cleanup interval
setInterval(() => {
    const now = Date.now();
    for (const [seed, ts] of PENDING_SEEDS) {
        if (now - ts > 60000) PENDING_SEEDS.delete(seed);
    }
    for (const [pk, session] of ACTIVE_SESSIONS) {
        if (now > session.expiresAt) ACTIVE_SESSIONS.delete(pk);
    }
}, 60000);

// Auto-discovery of Router Key
if (!ROUTER_PUBLIC_KEY || ROUTER_PUBLIC_KEY === 'REPLACE_WITH_ROUTER_PUBLIC_KEY') {
    console.log('[User] Router Public Key not configured. Attempting auto-discovery from Router...');
    setTimeout(async () => {
         try {
             // Assume Router is on standard port 3600 or configurable
             const res = await axios.get(`${config.routerUrl}/auth/key`);
             if (res.data.publicKey) {
                 ROUTER_PUBLIC_KEY = res.data.publicKey;
                 console.log(chalk.green('[User] Successfully fetched Router Public Key:'), ROUTER_PUBLIC_KEY);
             }
         } catch(e) { 
             console.error('[User] Failed to fetch router key.', e.message); 
         }
    }, 2000);
}

const AuthHandlers = {
    // Middleware: Strict Router Authorization (Level 3)
    middleware(req, res, next) {
        if (req.path.startsWith('/auth') || req.path === '/health') return next();
        
        // Exclude specific methods from strict router checking if needed (e.g. login is public initiation)
        // But user login needs to be secure. The original logic excluded these:
        if (req.body && (
            req.body.method === 'methods' || 
            req.body.method === 'user.register' ||
            req.body.method === 'user.login_request' ||
            req.body.method === 'user.login_verify'
        )) return next();
        
        // For other methods (profile, list), require Router Signature
        const tokenB58 = req.headers['x-router-token'];
        const sigB58 = req.headers['x-router-signature'];
        
        if (!tokenB58 || !sigB58) {
             return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Level 3 Security: Missing Authorization Headers' }, id: req.body?.id });
        }
        
        if (!ROUTER_PUBLIC_KEY || ROUTER_PUBLIC_KEY === 'REPLACE_WITH_ROUTER_PUBLIC_KEY') {
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
                    console.log(chalk.magenta('[User] Verified Router Request for User:'), payload.user, 'Permit:', payload.permit);
                }
                
                next();
            } else {
                 console.warn(chalk.red('[User] Invalid Signature Detect from IP:'), req.ip);
                 return res.status(403).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Invalid Router Signature' }, id: req.body?.id });
            }
        } catch (err) {
            console.error(chalk.red('[User] Auth Error:'), err.message);
            return res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Malformed Auth Token' }, id: req.body?.id });
        }
    },

    // Endpoints
    handleSeed(req, res) {
        const seed = crypto.randomBytes(32).toString('hex');
        PENDING_SEEDS.set(seed, Date.now());
        res.json({ seed });
    },

    handleVerify(req, res, SERVICE_NAME, SERVICE_VERSION, STARTUP_TIME) {
        const { signature, publicKey } = req.body;
        
        if (!signature || !publicKey) {
            return res.status(400).json({ success: false, error: 'Missing params' });
        }
    
        if (publicKey !== ROUTER_PUBLIC_KEY) {
            if (!ROUTER_PUBLIC_KEY) {
                console.warn('[User] WARNING: Router Public Key is not configured. Rejecting.');
                return res.status(403).json({ success: false, error: 'Router key not initialized' });
            }
            return res.status(403).json({ success: false, error: 'Router not authorized' });
        }
    
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
            return res.status(400).json({ success: false, error: 'Invalid Format' });
        }
    
        if (validSeed) {
            PENDING_SEEDS.delete(validSeed);
            ACTIVE_SESSIONS.set(publicKey, {
                timestamp: Date.now(),
                expiresAt: Date.now() + config.linkTimeout
            });
            
            console.log(`[User] Link established with Router: ${publicKey}`);
            return res.json({ 
                success: true, 
                serviceName: SERVICE_NAME,
                version: SERVICE_VERSION,
                startupTime: STARTUP_TIME
            });
        } else {
            return res.status(401).json({ success: false, error: 'Invalid Signature or Expired Seed' });
        }
    }
};

module.exports = AuthHandlers;
