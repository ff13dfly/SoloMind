/**
 * Unified Log Storage Utility
 * Implements a hash-based distributed file storage system for logs.
 * 
 * Strategy:
 * 1. Calculate MD5 hash of the key.
 * 2. Use the first 6 characters to create a 3-level directory structure (2/2/2).
 * 3. Use the remaining hash as the filename.
 * 4. Append data to the file.
 * 
 * Example:
 * Key: "user_123" -> Hash: "ab83c899dd..."
 * Path: folder/ab/83/c8/99dd...8b.log
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Insert a log record into the storage system
 * 
 * @param {string} key - Unique identifier for the entity (e.g. userId, orderId)
 * @param {object|string} row - Data to be logged
 * @param {string} [folder='logs'] - Root folder for storage (defaults to 'logs' in current dir)
 * @returns {string} - Absolute path of the written file
 */
function insert(key, row, folder = 'logs') {
    if (key === undefined || key === null || key === '') throw new Error('Log insert failed: Missing key');

    // 1. Calculate Hash (MD5)
    // Secure handling for Objects: JSON stringify to avoid [object Object] collisions
    const keyString = (typeof key === 'object') ? JSON.stringify(key) : String(key);
    const hash = crypto.createHash('md5').update(keyString).digest('hex');

    // 2. Directory Hashing (3 Levels)
    // Level 1: chars 0-2 (e.g. 'ab')
    // Level 2: chars 2-4 (e.g. '83')
    // Level 3: chars 4-6 (e.g. 'c8')
    const dirL1 = hash.substring(0, 2);
    const dirL2 = hash.substring(2, 4);
    const dirL3 = hash.substring(4, 6);
    
    // Remaining part for filename
    const filenameBody = hash.substring(6);
    const filename = `${filenameBody}.log`;

    // 3. Construct Paths
    // Resolve folder to absolute path if needed, or rely on path.join
    const fileDir = path.join(folder, dirL1, dirL2, dirL3);
    const filePath = path.join(fileDir, filename);

    // 4. Ensure Directory Exists
    if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
    }


    // 5. Prepare Data
    let entry = typeof row === 'string' ? row : JSON.stringify(row);
    
    // Safety Limit: 32KB per row
    // Prevents massive file growth and memory issues during parsing
    const MAX_ROW_LENGTH = 32 * 1024;
    
    if (entry.length > MAX_ROW_LENGTH) {
        // If too large, don't write the whole thing. Write a truncated valid JSON object if possible,
        // or just a truncated string fallback.
        const truncated = {
            error: 'LOG_TOO_LARGE',
            size: entry.length,
            preview: entry.substring(0, 200) + '...'
        };
        entry = JSON.stringify(truncated);
    }

    try {
        fs.appendFileSync(filePath, entry + '\n');
    } catch (e) {
        console.error(`[Logger] Failed to write to ${filePath}: ${e.message}`);
        // Fallback: Try writing to a fallback error log in current dir, or just swallow to maintain liveness
        // In this sample, we just log to stderr.
    }

    return filePath;
}

/**
 * Query logs for a specific key
 * 
 * @param {string} key - Unique identifier
 * @param {string} [folder='logs'] - Root folder
 * @param {number} [lines=100] - Max lines to return (from end)
 * @returns {Array<object>} - Array of parsed log entries
 */
function query(key, folder = 'logs', lines = 100) {
    if (!key) return [];

    const keyString = (typeof key === 'object') ? JSON.stringify(key) : String(key);
    const hash = crypto.createHash('md5').update(keyString).digest('hex');

    const dirL1 = hash.substring(0, 2);
    const dirL2 = hash.substring(2, 4);
    const dirL3 = hash.substring(4, 6);
    const filenameBody = hash.substring(6);
    
    // Construct Path
    const filePath = path.join(folder, dirL1, dirL2, dirL3, `${filenameBody}.log`);

    if (!fs.existsSync(filePath)) {
        return [];
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileLines = content.trim().split('\n');
        
        // Return last N lines
        const slice = fileLines.slice(-lines);
        
        return slice.map(line => {
            try { return JSON.parse(line); } catch (e) { return null; }
        }).filter(x => x);
    } catch (e) {
        console.error(`[Logger] Read failed: ${e.message}`);
        return [];
    }
}

module.exports = {
    insert,
    query
};
