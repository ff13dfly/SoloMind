const crypto = require('crypto');

// Replicate client-side logic (PBKDF2) using Node's crypto
// Client: password + username as key
// PBKDF2(key, salt, iterations, 32, 'sha256')

const password = 'admin123';
const username = 'admin';
const salt = '82f37fd14558c3741652aa2d4dcf88fd';
const iterations = 200000;
// The original hash before my change
const originalHash = '28cd1ad9bc77b57f0d8fa92729e4c73eb21a65e04c8283c0373efe78891719ed';

const key = password + username;
const saltBuffer = Buffer.from(salt, 'hex');

crypto.pbkdf2(key, saltBuffer, iterations, 32, 'sha256', (err, derivedKey) => {
    if (err) throw err;
    const computedHash = derivedKey.toString('hex');
    console.log('Original Hash:', originalHash);
    console.log('Computed Hash:', computedHash);
    console.log('Matches Original:', originalHash === computedHash);
});
