const crypto = require('crypto');
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function generateId(length = 8) {
    if (length <= 0) return '';
    const bytes = crypto.randomBytes(length);
    let id = '';
    for (let i = 0; i < length; i++) {
        const index = bytes[i] % 58;
        id += BASE58_CHARS[index];
    }
    return id;
}

module.exports = { generateId };
