/**
 * Keypair Management Handler
 * Handles identity keypair generation, encryption, and loading
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Keypair } = require('@solana/web3.js');

const KEYPAIR_PATH = path.join(__dirname, '../.keypair');
const PASSWORD_PATH = path.join(__dirname, '../.password');

let keypair = null;

/**
 * Load existing keypair or generate a new one
 * @param {boolean} debug - Whether to use encryption
 */
function loadOrGenerateKeypair(debug = false) {
    let secretKey;

    if (fs.existsSync(KEYPAIR_PATH)) {
        const fileContent = fs.readFileSync(KEYPAIR_PATH, 'utf8');
        
        try {
            const parsed = JSON.parse(fileContent);
            
            // Auto-detect format: encrypted (has iv & content) vs plaintext (array)
            if (parsed.iv && parsed.content && fs.existsSync(PASSWORD_PATH)) {
                // Encrypted format - decrypt
                const password = fs.readFileSync(PASSWORD_PATH, 'utf8');
                const algorithm = 'aes-256-ctr';
                const key = crypto.scryptSync(password, 'salt', 32);
                const iv = Buffer.from(parsed.iv, 'hex');
                const decipher = crypto.createDecipheriv(algorithm, key, iv);
                const decrypted = Buffer.concat([decipher.update(Buffer.from(parsed.content, 'hex')), decipher.final()]);
                secretKey = new Uint8Array(JSON.parse(decrypted.toString()));
                console.log('[Router] Keypair decrypted and loaded.');
            } else if (Array.isArray(parsed)) {
                // Plaintext format - array of bytes
                secretKey = new Uint8Array(parsed);
                console.log('[Router] Keypair loaded (plaintext).');
            } else if (parsed.iv && parsed.content && !fs.existsSync(PASSWORD_PATH)) {
                console.error('[Router] Keypair is encrypted but .password file not found.');
                process.exit(1);
            } else {
                console.error('[Router] Invalid keypair file format.');
                process.exit(1);
            }
        } catch (e) {
            console.error('[Router] Failed to parse keypair file:', e.message);
            process.exit(1);
        }
    } else {
        // Generate new
        keypair = Keypair.generate();
        secretKey = keypair.secretKey;
        const secretKeyArray = Array.from(secretKey);

        if (debug) {
            // Encrypt
            const password = crypto.randomBytes(16).toString('hex');
            fs.writeFileSync(PASSWORD_PATH, password);
            
            const algorithm = 'aes-256-ctr';
            const key = crypto.scryptSync(password, 'salt', 32);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(algorithm, key, iv);
            const encrypted = Buffer.concat([cipher.update(JSON.stringify(secretKeyArray)), cipher.final()]);
            
            const fileData = JSON.stringify({
                iv: iv.toString('hex'),
                content: encrypted.toString('hex')
            });
            fs.writeFileSync(KEYPAIR_PATH, fileData);
            console.log('[Router] Generated new Keypair. Encrypted with random password.');
        } else {
            fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(secretKeyArray));
            console.log('[Router] Generated new Keypair. Saved plaintext.');
        }
    }

    if (secretKey) {
        keypair = Keypair.fromSecretKey(secretKey);
    }
    
    if (keypair) {
        console.log('[Router] Public Key:', keypair.publicKey.toBase58());
    }
}

/**
 * Get the current keypair
 * @returns {Keypair|null}
 */
function getKeypair() {
    return keypair;
}

module.exports = {
    loadOrGenerateKeypair,
    getKeypair
};
