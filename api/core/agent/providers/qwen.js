const chalk = require('chalk');
const https = require('https');
const PromptBuilder = require('../lib/PromptBuilder');

// DashScope API Constants
const DASHSCOPE_BASE_URL = 'dashscope.aliyuncs.com';
const MODEL_CHAT = 'qwen-turbo';
const MODEL_VL = 'qwen-vl-plus';
const MODEL_AUDIO = 'qwen-audio-turbo';

class QwenProvider {
    constructor(config) {
        this.config = config;
        this.apiKey = config.qwenApiKey;
        console.log('[Qwen] Provider initialized. API Key present:', !!this.apiKey, this.apiKey ? `(Starts with ${this.apiKey.substring(0, 4)}...)` : '');
    }

    async _callApi(path, body, model) {
        return new Promise((resolve, reject) => {
            if (!this.apiKey) {
                return reject(new Error('Missing DashScope API Key'));
            }
            const payload = JSON.stringify({
                model: model,
                input: body.input,
                parameters: body.parameters || {}
            });
            const options = {
                hostname: DASHSCOPE_BASE_URL,
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                }
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            reject(new Error(response.message || `API Error: ${res.statusCode}`));
                        }
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });
            req.on('error', (e) => reject(e));
            req.write(payload);
            req.end();
        });
    }

    async chat({ text, history, model }) {
        console.log(chalk.blue('[Qwen] Chat...'));
        const targetModel = model || MODEL_CHAT;
        const lang = this.config.language || 'zh';
        const messages = [];
        
        if (history && Array.isArray(history) && history.length > 0) {
            messages.push(...history);
            messages.push({ role: 'user', content: text });
        } else {
            // New chat - use PromptBuilder to build a constrained system + user prompt
            const fullPrompt = PromptBuilder.buildChat(text, this.config, lang);
            messages.push({ role: 'user', content: fullPrompt });
        }

        try {
            const response = await this._callApi('/api/v1/services/aigc/text-generation/generation', {
                input: { messages },
                parameters: { result_format: 'message' }
            }, targetModel);

            if (response.output && response.output.choices) {
                const content = response.output.choices[0].message.content;
                return {
                    success: true,
                    text: content,
                    metadata: { provider: 'qwen', model: targetModel, request_id: response.request_id }
                };
            }
            throw new Error('No output from Qwen Chat');
        } catch (error) {
            console.error(chalk.red('[Qwen] Chat Error:'), error.message);
            return { success: false, error: error.message, metadata: { provider: 'qwen', model: targetModel } };
        }
    }

    async parseImage({ image, scene, lang, model }) {
        console.log(chalk.blue('[Qwen] Parsing Image...'));
        const targetModel = model || MODEL_VL;
        const targetLang = lang || this.config.language || 'zh';
        const prompt = PromptBuilder.buildVision(scene, targetLang);

        // Ensure image is base64 and has correct prefix for DashScope
        // DashScope VL API expects image URL or local path. For base64, it's a bit specific.
        // Actually, DashScope VL often requires a public URL or a multipart upload.
        // But some models support base64 in messages. Let's check.
        // If not, we might need a workaround. For now, we assume simple message format if supported.
        
        try {
            const response = await this._callApi('/api/v1/services/aigc/multimodal-generation/generation', {
                input: {
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { image: image.startsWith('http') ? image : image }, // DashScope VL expects URL or data:image/...
                                { text: prompt }
                            ]
                        }
                    ]
                }
            }, targetModel);

            if (response.output && response.output.choices) {
                const content = response.output.choices[0].message.content;
                // VL models return an array of contents usually, or a string
                const text = typeof content === 'string' ? content : (content[0].text || '');
                
                return {
                    success: true,
                    text: text,
                    metadata: { provider: 'qwen', model: targetModel, request_id: response.request_id }
                };
            }
            throw new Error(response.message || 'No output from Qwen VL');
        } catch (error) {
            console.error(chalk.red('[Qwen] Image Error:'), error.message);
            return { success: false, error: error.message, metadata: { provider: 'qwen', model: targetModel } };
        }
    }

    async parseText({ text, schema, model }) {
        console.log(chalk.blue('[Qwen] Parsing Text...'));
        const targetModel = model || MODEL_CHAT;
        try {
            const response = await this._callApi('/api/v1/services/aigc/text-generation/generation', {
                input: {
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant that outputs JSON.' },
                        { role: 'user', content: text }
                    ]
                },
                parameters: { result_format: 'message' }
            }, targetModel);
            if (response.output && response.output.choices) {
                const content = response.output.choices[0].message.content;
                let data = content;
                try { if (schema) data = JSON.parse(content); } catch (e) {}
                return { success: true, data: data, metadata: { provider: 'qwen', model: targetModel } };
            }
            throw new Error('No output from Qwen Chat');
        } catch (error) {
            console.error(chalk.red('[Qwen] Text Error:'), error.message);
            return { success: false, error: error.message, metadata: { provider: 'qwen', model: targetModel } };
        }
    }

    /**
     * Legacy Purpose Detection (Single Step Fallback)
     * Used when client calls agent.purpose without phase/context
     */
    async identifyPurpose({ text, capabilities, model, noWorkflow }) {
        console.log(chalk.blue(`[Qwen] Identify Purpose (Legacy Fallback)${noWorkflow ? ' [noWorkflow]' : ''}...`));
        
        // Map legacy call to Phase 2 (Fine Matching) using all capabilities as context
        // PromptBuilder expects 'capabilities' to be an array of strings describing the methods
        const selectedCaps = (capabilities || []).filter(cap => {
            if (noWorkflow && cap.type === 'workflow') return false;
            return true;
        });

        const formattedCapabilities = selectedCaps.map(cap => {
            if (typeof cap === 'string') return cap;
            // If it's a workflow, use specialized formatting
            if (cap.type === 'workflow') {
                return `- [ID: ${cap.id}] [工作流名称: ${cap.name}]: ${cap.desc || ''}`;
            }
            // If it's an object (like from Registry), format it
            return `- [ID: ${cap.name || cap.id}] [描述]: ${cap.desc || cap.description || ''}`;
        });

        const context = {
            candidates: formattedCapabilities,
            workflows: [] // Legacy mode typically didn't have full workflow context in this path
        };

        const result = await this.identifyPurposeWithContext({
            text,
            phase: 2,
            context,
            model,
            noWorkflow
        });

        // Transform result back to legacy format (single string or null)
        if (result.candidates && result.candidates.length > 0) {
            const best = result.candidates[0];
            // If ID is valid and not 'null', return the full candidate object
            // This includes { id, confidence, reason }
            if (best.id && best.id !== 'null') {
                return best; 
            }
        }
        
        // Return object structure for consistency in fallback case
        return { id: 'agent.chat' };
    }

    async identifyPurposeWithContext({ text, memory = '', phase, context, model, noWorkflow }) {
        if (noWorkflow) {
            console.log(chalk.gray('[Qwen] noWorkflow enabled, filtering context candidates...'));
            if (context.candidates) {
                context.candidates = context.candidates.filter(cap => {
                    // Check if the formatted string contains [工作流名称
                    // This is a bit hacky but works for the current PromptBuilder/Provider structure
                    return !cap.includes('[工作流名称:'); 
                });
            }
        }
        console.log(chalk.blue(`[Qwen] Purpose Detection - Phase ${phase}${noWorkflow ? ' [noWorkflow]' : ''}${memory ? ' [with Memory]' : ''}`));
        const targetModel = model || MODEL_CHAT;
        const lang = this.config.language || 'zh';

        if (phase === 1) {
            const prompt = PromptBuilder.buildPhase1(text, context, lang, memory);
            try {
                const response = await this._callApi('/api/v1/services/aigc/text-generation/generation', {
                    input: { messages: [{ role: 'user', content: prompt }] },
                    parameters: { result_format: 'message' }
                }, targetModel);
                const content = response.output?.choices?.[0]?.message?.content || '{}';
                console.log(chalk.gray(`[Qwen] Phase 1 Raw: ${content}`));
                const match = content.match(/\{[\s\S]*\}/);
                if (match) {
                    const result = JSON.parse(match[0]);
                    return { services: result.services || [], categories: result.categories || [] };
                }
            } catch (e) {
                console.error('[Qwen] Phase 1 Error:', e.message);
            }
            return { services: [], categories: [] };
        } else if (phase === 2) {
            const prompt = PromptBuilder.buildPhase2(text, context, lang, memory);
            const systemPrompt = this.config.systemPrompts[lang] || this.config.systemPrompts['en'];
            try {
                const response = await this._callApi('/api/v1/services/aigc/text-generation/generation', {
                    input: { 
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: prompt }
                        ] 
                    },
                    parameters: { result_format: 'message' }
                }, targetModel);
                const content = response.output?.choices?.[0]?.message?.content || '{}';
                console.log(chalk.gray(`[Qwen] Phase 2 Raw: ${content}`));
                const match = content.match(/\{[\s\S]*\}/);
                if (match) {
                    const result = JSON.parse(match[0]);
                    // Support both new (candidates array) and legacy (single selected) formats
                    if (result.candidates && Array.isArray(result.candidates)) {
                        return { candidates: result.candidates };
                    } else if (result.selected) {
                        // Backward compatibility wrapper
                        return { 
                            candidates: [{
                                ...result.selected,
                                params: result.params,
                                missingParams: result.missingParams
                            }]
                        };
                    }
                }
            } catch (e) {
                console.error('[Qwen] Phase 2 Error:', e.message);
                return { candidates: [{ id: 'agent.error', error: e.message }] };
            }
            return { candidates: [] };
        }
        throw new Error('Invalid phase parameter. Must be 1 or 2.');
    }

    /**
     * Focus: Extract parameters from user input and generate hint
     * @param {object} params - { text, workflow, currentParams, missingFields, model }
     * @returns {object} { extracted_params, confidence, hint, action }
     */
    async focus({ text, memory = '', workflow, currentParams, missingFields, model }) {
        console.log(chalk.blue(`[Qwen] Focus - Parameter Extraction${memory ? ' [with Memory]' : ''}`));
        const targetModel = model || MODEL_CHAT;
        const lang = this.config.language || 'zh';
        
        // Use Beijing time (UTC+8) for better AI understanding
        const now = new Date();
        const beijingOffset = 8 * 60 * 60 * 1000;
        const beijingNow = new Date(now.getTime() + beijingOffset);
        const currentHour = beijingNow.getUTCHours();
        const currentMinute = beijingNow.getUTCMinutes();
        
        // Pre-calculate today and tomorrow dates
        const todayDate = beijingNow.toISOString().split('T')[0];
        const tomorrowDate = new Date(beijingNow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Build time context with explicit date guidance
        const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        const timeContext = `现在北京时间 ${todayDate} ${currentTimeStr}。今天日期=${todayDate}，明天日期=${tomorrowDate}。重要规则：如果用户提到的时间点早于 ${currentTimeStr}（说明今天该时间已过），请务必使用明天的日期 ${tomorrowDate}。例如：现在是${currentTimeStr}，用户说"早上8点"，因为8点早于${currentTimeStr}，所以是指明天。`;
        
        console.log(chalk.gray(`[Qwen] Time Context: ${timeContext}`));

        const prompt = PromptBuilder.buildFocus(text, {
            workflow,
            currentParams,
            missingFields,
            currentTime: timeContext,
            memory // <--- Pass memory here
        }, lang);
        console.log(chalk.gray(`[Qwen] Focus Prompt (first 500 chars): ${prompt.substring(0, 500)}...`));

        try {
            const response = await this._callApi('/api/v1/services/aigc/text-generation/generation', {
                input: { messages: [{ role: 'user', content: prompt }] },
                parameters: { result_format: 'message' }
            }, targetModel);

            const content = response.output?.choices?.[0]?.message?.content || '{}';
            console.log(chalk.gray(`[Qwen] Focus Raw: ${content}`));

            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const result = JSON.parse(match[0]);
                return {
                    extracted_params: result.extracted_params || {},
                    confidence: result.confidence || {},
                    hint: result.hint || '',
                    action: result.action || null,
                    clarification: result.clarification || null
                };
            }
            // No valid JSON found - parsing issue
            return {
                extracted_params: {},
                confidence: {},
                hint: '抱歉，我没能理解您的意思。请再说一遍？',
                action: null
            };
        } catch (e) {
            console.error(chalk.red('[Qwen] Focus Error:'), e.message);
            // Check if it's a network error
            const isNetworkError = e.message && (
                e.message.includes('network') ||
                e.message.includes('socket') ||
                e.message.includes('ECONNREFUSED') ||
                e.message.includes('ETIMEDOUT') ||
                e.message.includes('TLS') ||
                e.message.includes('fetch')
            );
            return {
                extracted_params: {},
                confidence: {},
                hint: isNetworkError 
                    ? '网络连接出现问题，请稍后再试~ 🔄' 
                    : '抱歉，处理时遇到了问题。请再说一遍？',
                action: null
            };
        }
    }
    /**
     * Generate test cases for a workflow
     * @param {object} params - { workflow, count, model }
     */
    async generateCases({ workflow, count, model }) {
        console.log(chalk.blue('[Qwen] Generating Test Cases...'));
        const targetModel = model || MODEL_CHAT;
        const lang = this.config.language || 'zh';
        const prompt = PromptBuilder.buildCases(workflow, count, lang);

        try {
            const response = await this._callApi('/api/v1/services/aigc/text-generation/generation', {
                input: { messages: [{ role: 'user', content: prompt }] },
                parameters: { result_format: 'message' }
            }, targetModel);

            const content = response.output?.choices?.[0]?.message?.content || '{}';
            console.log(chalk.gray(`[Qwen] Cases Raw: ${content}`));

            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const result = JSON.parse(match[0]);
                return {
                    success: true,
                    workflow_id: result.workflow_id,
                    cases: result.cases || [],
                    prompt: prompt // Expose raw prompt for debugging
                };
            }
            throw new Error('Invalid JSON output from Qwen');
        } catch (error) {
            console.error(chalk.red('[Qwen] Generate Cases Error:'), error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = QwenProvider;
