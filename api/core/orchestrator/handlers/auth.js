const crypto = require('crypto');
const bs58 = require('bs58').default || require('bs58');
const tweetnacl = require('tweetnacl');
const { PublicKey } = require('@solana/web3.js');
const chalk = require('chalk');

const PENDING_SEEDS = new Map();
const ACTIVE_SESSIONS = new Map();

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

module.exports = {
    handleSeed: (req, res) => {
        const seed = crypto.randomBytes(32).toString('hex');
        PENDING_SEEDS.set(seed, Date.now());
        res.json({ seed });
    },

    handleVerify: (req, res, SERVICE_NAME, SERVICE_VERSION, STARTUP_TIME) => {
        const { signature, publicKey } = req.body;
        if (!signature || !publicKey) {
            return res.status(400).json({ success: false, error: 'Missing params' });
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
            console.error(chalk.red(`[${SERVICE_NAME}] Verification Error:`), e.message);
            return res.status(400).json({ success: false, error: 'Invalid Format' });
        }

        if (validSeed) {
            PENDING_SEEDS.delete(validSeed);
            ACTIVE_SESSIONS.set(publicKey, {
                timestamp: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000)
            });
            console.log(chalk.green(`[${SERVICE_NAME}] Link established with: ${publicKey}`));
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
