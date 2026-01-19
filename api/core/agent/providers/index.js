const GeminiProvider = require('./gemini');
const OpenAIProvider = require('./openai');
const QwenProvider = require('./qwen');

class ProviderFactory {
    static instances = {};

    static getProvider(config, model) {
        let type = config.provider || 'gemini';

        // Auto-detect provider from model name if provided
        if (model) {
            if (model.startsWith('qwen')) type = 'qwen';
            else if (model.includes('gemini')) type = 'gemini';
            else if (model.startsWith('gpt') || model.includes('openai')) type = 'openai';
        }

        if (!this.instances[type]) {
             switch (type.toLowerCase()) {
                case 'gemini':
                    this.instances[type] = new GeminiProvider({ ...config, language: config.agents.gemini.language });
                    break;
                case 'openai':
                    this.instances[type] = new OpenAIProvider({ ...config, language: config.agents.openai.language });
                    break;
                case 'qwen':
                    this.instances[type] = new QwenProvider({ ...config, language: config.agents.qwen.language });
                    break;
                default:
                    console.warn(`Unknown provider ${type}, falling back to Gemini`);
                    this.instances[type] = new GeminiProvider({ ...config, language: config.agents.gemini.language });
            }
        }
        return this.instances[type];
    }
}

module.exports = ProviderFactory;
