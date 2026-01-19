const { GoogleGenerativeAI } = require("@google/generative-ai");
const chalk = require('chalk');

class GeminiProvider {
    constructor(config) {
        this.config = config;
        this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    }

    async parseImage({ image, prompt, model }) {
        console.log(chalk.blue('[Gemini] Parsing Image...'));
        const targetModel = model || "gemini-2.0-flash";
        try {
            // Use specified model or default to gemini-2.0-flash
            const genModel = this.genAI.getGenerativeModel({ model: targetModel });

            // image is expected to be base64 string
            // Remove header if present (data:image/jpeg;base64,)
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            
            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg",
                },
            };

            const result = await genModel.generateContent([prompt || "Describe this image", imagePart]);
            const response = await result.response;
            const text = response.text();

            // Try to parse JSON if the prompt requested it
            try {
                // Find JSON-like structure
                const match = text.match(/\{[\s\S]*\}/);
                if (match) {
                    return {
                        success: true,
                        data: JSON.parse(match[0]),
                        metadata: { provider: 'gemini', model: targetModel }
                    };
                }
            } catch (e) {
                // If not JSON, return text
            }

            return {
                success: true,
                data: { text },
                metadata: { provider: 'gemini', model: targetModel }
            };

        } catch (error) {
            console.error(chalk.red('[Gemini] Image Error:'), error);
            throw error;
        }
    }

    async transcribeAudio({ audio, model }) {
        console.log(chalk.blue('[Gemini] Transcribing Audio...'));
        const targetModel = model || "gemini-2.0-flash";
        // Gemini 2.0 Flash supports audio input
        try {
             const genModel = this.genAI.getGenerativeModel({ model: targetModel });
             
             // audio is expected to be base64 string
             const base64Data = audio.replace(/^data:audio\/\w+;base64,/, "");
             
             const audioPart = {
                 inlineData: {
                     data: base64Data,
                     mimeType: "audio/mp3", // defaulting to mp3, strictly we should detect
                 },
             };

             const result = await genModel.generateContent(["Transcribe this audio", audioPart]);
             const response = await result.response;
             const text = response.text();

             return {
                 success: true,
                 text: text,
                 metadata: { provider: 'gemini', model: targetModel }
             };

        } catch (error) {
            console.error(chalk.red('[Gemini] Audio Error:'), error);
            throw error;
        }
    }

    async parseText({ text, schema, model }) {
        console.log(chalk.blue('[Gemini] Parsing Text...'));
        const targetModel = model || "gemini-2.0-flash";
        try {
            const genModel = this.genAI.getGenerativeModel({ model: targetModel });
            
            const prompt = `
                Analyze the following text and extract information according to this schema:
                ${JSON.stringify(schema, null, 2)}
                
                Text: "${text}"
                
                Return ONLY valid JSON.
            `;

            const result = await genModel.generateContent(prompt);
            const response = await result.response;
            const output = response.text();
            
            const match = output.match(/\{[\s\S]*\}/);
            if (match) {
                 return {
                    success: true,
                    data: JSON.parse(match[0]),
                    metadata: { provider: 'gemini', model: targetModel }
                };
            }
            
            throw new Error("Failed to parse JSON response");

        } catch (error) {
             console.error(chalk.red('[Gemini] Text Error:'), error);
            throw error;
        }
    }

    async identifyPurpose({ text, image, capabilities, model, noWorkflow }) {
        console.log(chalk.blue(`[Gemini] Identifying Purpose (Multi-Step)${noWorkflow ? ' [noWorkflow]' : ''}...`));
        const targetModel = model || "gemini-2.0-flash";
        const lang = this.config.language || 'en';
        
        const CapabilityManager = require('../CapabilityManager'); 
        
        // --- STEP 1: Service Selection ---
        const serviceDesc = CapabilityManager.getServiceDescriptions(lang);
        const prompt1 = this._buildStep1Prompt(text, serviceDesc, lang);
        
        let step1Res;
        try {
             const genModel = this.genAI.getGenerativeModel({ model: targetModel });
             step1Res = await genModel.generateContent(prompt1);
        } catch (e) {
            console.error('[Gemini] Step 1 Failed:', e);
            return 'agent.chat';
        }

        const content1 = step1Res.response.text();
        console.log(chalk.gray(`[Gemini] Step 1 Result: ${content1}`));
        
        let services = [];
        try {
             const match = content1.match(/\[.*\]/s);
             if (match) services = JSON.parse(match[0]);
        } catch (e) { console.warn('JSON Parse Error Step 1'); }

        const selectedService = services[0];
        if (!selectedService || selectedService === 'other' || selectedService === 'agent') {
            return 'agent.chat';
        }

        // --- STEP 2: Method Selection ---
        const methodDesc = CapabilityManager.getMethodsForService(selectedService, lang);
        const prompt2 = this._buildStep2Prompt(text, methodDesc, lang);

        let step2Res;
        try {
             const genModel = this.genAI.getGenerativeModel({ model: targetModel });
             step2Res = await genModel.generateContent(prompt2);
        } catch (e) {
             console.error('[Gemini] Step 2 Failed:', e);
             return 'agent.chat';
        }

         const content2 = step2Res.response.text();
         console.log(chalk.gray(`[Gemini] Step 2 Result: ${content2}`));

         let methods = [];
         try {
              const match = content2.match(/\[.*\]/s);
              if (match) methods = JSON.parse(match[0]);
         } catch (e) { console.warn('JSON Parse Error Step 2'); }

         if (methods.length > 0 && methods[0] !== 'other' && methods[0] !== 'null') {
             return methods[0];
         }
         
         return 'agent.chat';
    }

    _buildStep1Prompt(input, serviceDesc, lang) {
        if (lang === 'zh') {
            return `
请分析用户输入属于哪个服务领域。
[服务列表]:
${serviceDesc}
- agent: 一般闲聊、问答、无法归类到上述服务的内容

用户输入: "${input}"

规则:
1. 如果匹配，返回 ["服务名"] (例如 ["crm"])
2. 如果不匹配或为闲聊，返回 ["agent"]
3. 严格遵守服务描述中的否定约束（例如"不用于..."）。
4. 仅返回JSON数组。
`;
        } else {
            return `
Analyze which service domain the user input belongs to.
[Services]:
${serviceDesc}
- agent: General chat, Q&A, or anything not fitting the above services

User Input: "${input}"

Rules:
1. If matched, return ["serviceName"] (e.g. ["crm"])
2. If not matched or general chat, return ["agent"]
3. Strictly adhere to negative constraints in descriptions (e.g. "NOT for...").
4. Return ONLY a JSON array.
`;
        }
    }

    _buildStep2Prompt(input, methodDesc, lang) {
        if (lang === 'zh') {
             return `
请从以下功能中选择最匹配的一项。
[功能列表]:
${methodDesc}

用户输入: "${input}"

规则:
1. 必须从列表中选择一项。
2. 如果没有合适的，返回 ["other"]
3. 仅返回JSON数组。
`;
        } else {
            return `
Select the most matching function from the list.
[Functions]:
${methodDesc}

User Input: "${input}"

Rules:
1. Must select one from the list.
2. If none match, return ["other"]
3. Return ONLY a JSON array.
`;
        }
    }

    async chat({ text, model }) {
        console.log(chalk.blue('[Gemini] Chatting...'));
        const targetModel = model || "gemini-2.0-flash";
        const lang = this.config.language || 'en';
        const PromptBuilder = require('../lib/PromptBuilder');

        try {
            const genModel = this.genAI.getGenerativeModel({ model: targetModel });
            const prompt = PromptBuilder.buildChat(text, this.config, lang);
            const result = await genModel.generateContent(prompt);
            const response = await result.response;
            return {
                success: true,
                text: response.text(),
                metadata: { provider: 'gemini', model: targetModel }
            };
        } catch (error) {
            console.error(chalk.red('[Gemini] Chat Error:'), error);

            // Handle Quota/Rate Limits (429)
            if (error.message && (error.message.includes('429') || error.message.includes('Quota') || error.message.includes('limit'))) {
                return {
                    success: true,
                    text: "⚠️ **API Quota Exceeded**\n\nThe AI service is currently currently unavailable due to usage limits. Please check your [Google Cloud Console Quotas](https://console.cloud.google.com/iam-admin/quotas) or Billing settings.",
                    metadata: { provider: 'gemini', error: 'quota_exceeded' }
                };
            }

            // Handle Authentication Issues
            if (error.message && (error.message.includes('API key') || error.message.includes('403'))) {
                return {
                    success: true,
                    text: "⚠️ **Configuration Error**\n\nThe AI service failed to authenticate. Please check the `GEMINI_API_KEY` configuration on the server.",
                    metadata: { provider: 'gemini', error: 'auth_failed' }
                };
            }

            // Default Error
            return {
                success: true,
                text: `⚠️ **AI Service Error**\n\nI encountered an issue processing your request: ${error.message.substring(0, 100)}...`,
                metadata: { provider: 'gemini', error: 'unknown' }
            };
        }
    }

    async identifyPurposeWithContext({ text, phase, context, model, noWorkflow }) {
        if (noWorkflow && context.candidates) {
            context.candidates = context.candidates.filter(cap => !cap.includes('[工作流名称:'));
        }
        console.log(chalk.blue(`[Gemini] Purpose Detection - Phase ${phase}${noWorkflow ? ' [noWorkflow]' : ''}`));
        const targetModel = model || "gemini-2.0-flash";
        const lang = this.config.language || 'en';
        const PromptBuilder = require('../lib/PromptBuilder');

        if (phase === 1) {
            const prompt = PromptBuilder.buildPhase1(text, context, lang);
            try {
                const genModel = this.genAI.getGenerativeModel({ model: targetModel });
                const response = await genModel.generateContent(prompt);
                const content = response.response.text();
                console.log(chalk.gray(`[Gemini] Phase 1 Raw: ${content}`));
                const match = content.match(/\{[\s\S]*\}/);
                if (match) {
                    const result = JSON.parse(match[0]);
                    return { services: result.services || [], categories: result.categories || [] };
                }
            } catch (e) {
                console.error('[Gemini] Phase 1 Error:', e.message);
            }
            return { services: [], categories: [] };
        } else if (phase === 2) {
            const prompt = PromptBuilder.buildPhase2(text, context, lang);
            const systemPrompt = this.config.systemPrompts[lang] || this.config.systemPrompts['en'];
            
            try {
                const genModel = this.genAI.getGenerativeModel({ 
                    model: targetModel,
                    systemInstruction: systemPrompt 
                });
                const response = await genModel.generateContent(prompt);
                const content = response.response.text();
                console.log(chalk.gray(`[Gemini] Phase 2 Raw: ${content}`));
                const match = content.match(/\{[\s\S]*\}/);
                if (match) {
                    const result = JSON.parse(match[0]);
                    if (result.candidates && Array.isArray(result.candidates)) {
                        return { candidates: result.candidates };
                    }
                }
            } catch (e) {
                console.error('[Gemini] Phase 2 Error:', e.message);
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
    async focus({ text, workflow, currentParams, missingFields, model }) {
        console.log(chalk.blue('[Gemini] Focus - Parameter Extraction'));
        const targetModel = model || "gemini-2.0-flash";
        const lang = this.config.language || 'en';
        const PromptBuilder = require('../lib/PromptBuilder');
        const currentTime = new Date().toISOString();

        const prompt = PromptBuilder.buildFocus(text, {
            workflow,
            currentParams,
            missingFields,
            currentTime
        }, lang);

        try {
            const genModel = this.genAI.getGenerativeModel({ model: targetModel });
            const result = await genModel.generateContent(prompt);
            const response = await result.response;
            const content = response.text();

            console.log(chalk.gray(`[Gemini] Focus Raw: ${content}`));

            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    extracted_params: parsed.extracted_params || {},
                    confidence: parsed.confidence || {},
                    hint: parsed.hint || '',
                    action: parsed.action || null,
                    clarification: parsed.clarification || null
                };
            }
        } catch (e) {
            console.error(chalk.red('[Gemini] Focus Error:'), e.message);
        }

        // Fallback
        return {
            extracted_params: {},
            confidence: {},
            hint: lang === 'zh' ? '抱歉，我没能理解您的意思。请再说一遍？' : 'Sorry, I didn\'t understand. Could you please clarify?',
            action: null
        };
    }
}

module.exports = GeminiProvider;

