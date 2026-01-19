const chalk = require('chalk');

// Helper to simulate AI delay
const sleep = ms => new Promise(r => setTimeout(r, ms));

const MOCK_DATA_IMAGE = {
    type: 'room_layout',
    walls: [
        { start: [0,0], end: [5,0] },
        { start: [5,0], end: [5,4] },
        { start: [5,4], end: [0,4] },
        { start: [0,4], end: [0,0] }
    ]
};

class OpenAIProvider {
    constructor(config) {
        this.config = config;
        // In real impl: this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }

    async parseImage({ image, prompt, model }) {
        console.log(chalk.yellow('[OpenAI] Parsing Image (Mock)...'));
        await sleep(1500);
        return {
            success: true,
            data: MOCK_DATA_IMAGE,
            metadata: { provider: 'openai', model: model || 'gpt-4-vision-preview (mock)' }
        };
    }

    async transcribeAudio({ audio, model }) {
        console.log(chalk.yellow('[OpenAI] Transcribing Audio (Mock)...'));
        await sleep(1000);
        return {
            success: true,
            text: "Create a rectangular room 5 by 4 meters with a window on the north wall.",
            metadata: { provider: 'openai', model: model || 'whisper-1 (mock)' }
        };
    }

    async parseText({ text, schema, model }) {
        console.log(chalk.yellow('[OpenAI] Parsing Text (Mock)...'));
        await sleep(500);
        return {
            success: true,
            data: {
                intent: "create_room",
                dimensions: { width: 5, length: 4 },
                adjuncts: [{ type: 'window', location: 'north' }]
            },
            metadata: { provider: 'openai', model: model || 'gpt-4 (mock)' }
        };
    }

    async chat({ text, model }) {
        console.log(chalk.yellow('[OpenAI] Chatting (Mock)...'));
        await sleep(800);
        return {
            success: true,
            text: `[OpenAI Mock] I received: "${text}"`,
            metadata: { provider: 'openai', model: model || 'gpt-4 (mock)' }
        };
    }
}

module.exports = OpenAIProvider;
