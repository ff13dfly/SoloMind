require('dotenv').config();
const QwenProvider = require('./providers/qwen');
const config = require('./config');

console.log('--- Testing Qwen Provider Isolation ---');
console.log('Config Key:', config.qwenApiKey ? 'Present' : 'Missing');
if (config.qwenApiKey) {
    console.log('Key Length:', config.qwenApiKey.length);
    console.log('Key Preview:', config.qwenApiKey.substring(0, 5) + '...');
    // Check for whitespace
    if (config.qwenApiKey.trim() !== config.qwenApiKey) {
        console.warn('WARNING: Key has surrounding whitespace!');
    }
}

const provider = new QwenProvider(config);

(async () => {
    try {
        console.log('Sending Chat Request...');
        const result = await provider.chat({ text: 'Hello, are you there?', model: 'qwen-turbo' });
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
})();
