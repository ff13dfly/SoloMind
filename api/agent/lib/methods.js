const config = require('../config');
const chalk = require('chalk');
const ProviderFactory = require('../providers');

console.log(chalk.cyan(`[Agent] Initialized. Default provider: ${config.provider || 'gemini'}`));

const methods = {
    agent: {
        image: {
            parse: async (params) => {
                const provider = ProviderFactory.getProvider(config, params.model);
                return await provider.parseImage(params);
            }
        },
        audio: {
            transcribe: async (params) => {
                const provider = ProviderFactory.getProvider(config, params.model);
                return await provider.transcribeAudio(params);
            }
        },
        text: {
            parse: async (params) => {
                const provider = ProviderFactory.getProvider(config, params.model);
                return await provider.parseText(params);
            }
        },
        purpose: async (params) => {
            console.log('[DEBUG] purpose params:', JSON.stringify(params));
            const provider = ProviderFactory.getProvider(config, params.model);
            
            // Frontend-driven Two-Step Matching
            if (params.phase && params.context) {
                console.log('[DEBUG] Frontend-driven mode - calling identifyPurposeWithContext');
                return await provider.identifyPurposeWithContext({
                    text: params.text,
                    memory: params.memory || '', // Memory context from useMemory hook
                    phase: params.phase,
                    context: params.context,
                    model: params.model,
                    noWorkflow: params.noWorkflow // Pass through
                });
            }
            
            // Legacy mode
            console.log('[DEBUG] Legacy mode - calling identifyPurpose');
            const CapabilityManager = require('./CapabilityManager');
            const systemCapabilities = await CapabilityManager.getCapabilities();

            return await provider.identifyPurpose({
                text: params.text,
                image: params.image,
                memory: params.memory || '', // Memory context from useMemory hook
                capabilities: systemCapabilities,
                model: params.model,
                noWorkflow: params.noWorkflow // Pass through
            });
        },
        chat: async (params) => {
            const provider = ProviderFactory.getProvider(config, params.model);
            return await provider.chat(params);
        },
        focus: async (params) => {
            console.log('[DEBUG] focus params:', JSON.stringify(params));
            const provider = ProviderFactory.getProvider(config, params.model);
            
            // Validate required params
            if (!params.workflow_id || !params.user_input) {
                throw { code: -32602, message: 'Missing required params: workflow_id, user_input' };
            }
            
            // Build workflow context for provider
            const CapabilityManager = require('./CapabilityManager');
            const allCapabilities = await CapabilityManager.getCapabilities();
            const cachedWf = allCapabilities.find(w => w.id === params.workflow_id || w.name === params.workflow_id);

            const workflow = {
                id: params.workflow_id,
                name: params.workflow_name || params.workflow_id,
                desc: params.workflow_desc || '',
                synonyms: params.synonyms || {},
                required_inputs: params.required_inputs || [],
                // Include full params definition if available
                params: cachedWf ? cachedWf.params : [],
                ai_meta: cachedWf ? cachedWf.ai_meta : undefined
            };
            
            console.log('[DEBUG] Focus workflow params:', JSON.stringify(workflow.params));
            
            return await provider.focus({
                text: params.user_input,
                memory: params.memory || '', // <--- Pass memory to provider
                workflow,
                currentParams: params.current_params || {},
                missingFields: params.missing_fields || [],
                model: params.model
            });
        },
        cases: async (params) => {
            console.log('[DEBUG] cases params:', JSON.stringify(params));
            const provider = ProviderFactory.getProvider(config, params.model);
            
            // Get workflow definition
            const CapabilityManager = require('./CapabilityManager');
            const allCapabilities = await CapabilityManager.getCapabilities();
            const workflow = allCapabilities.find(w => w.id === params.workflow_id || w.name === params.workflow_id);

            if (!workflow) {
                throw { code: -32602, message: `Workflow ${params.workflow_id} not found` };
            }

            return await provider.generateCases({
                workflow,
                count: params.count || 5,
                model: params.model
            });
        }
    }
};

module.exports = methods;
