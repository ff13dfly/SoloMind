
require('dotenv').config({ path: '/Users/fuzhongqiang/Desktop/www/fang/api/agent/.env' });
const CapabilityManager = require('../lib/CapabilityManager');
const PromptBuilder = require('../lib/PromptBuilder');
const QwenProvider = require('../providers/qwen');
const config = require('../config');

async function run() {
    console.log("Starting Analysis Script...");
    
    // 1. Fetch Capabilities
    const capabilities = await CapabilityManager.getCapabilities();
    console.log(`Loaded ${capabilities.length} capabilities.`);

    // 2. Format Context
    const formattedCapabilities = (capabilities || []).map(cap => {
        if (typeof cap === 'string') return cap;
        if (cap.type === 'workflow') {
            return `- [ID: ${cap.id}] [工作流名称: ${cap.name}]: ${cap.desc || ''}`;
        }
        return `- [ID: ${cap.name || cap.id}] [描述]: ${cap.desc || cap.description || ''}`;
    });

    const context = {
        candidates: formattedCapabilities,
        workflows: [] // Logic in qwen.js identifyPurpose uses empty workflows array for legacy context building
    };
    
    const text = "这是一张卡通机械猫的图片。";
    const lang = 'zh';

    // 3. Reconstruct Original Prompt
    let originalPrompt = PromptBuilder.buildPhase2(text, context, lang);
    
    console.log("\n=== ORIGINAL PROMPT (Snippet) ===");
    console.log(originalPrompt.substring(0, 500) + "\n...[truncated]...\n" + originalPrompt.substring(originalPrompt.length - 500));
    
    // 4. Modify Prompt to add 'reason' field or analysis requirement
    // The user asked to "increase reason field".
    // We will ask for explicit output of the thinking process (CoT) before the JSON.
    // And ensure the standard 'reason' field is also populated.
    
    const additionalInstruction = `
    
    【特别要求】：
    请在返回 JSON 之前，先输出一段【思维链分析】。
    请详细分析用户输入"${text}"与每一个候选工作流的相关性。
    解释为什么你认为它匹配或不匹配。
    尤其是思考：这张图片的内容是否真的触发了某个具体的业务操作？
    如果没有极强的匹配度，是否应该返回 null？
    `;
    
    // Insert before "请执行:" or at the end of rules
    const modifiedPrompt = originalPrompt.replace("请执行:", additionalInstruction + "\n请执行:");
    
    console.log("\n=== MODIFIED PROMPT (Snippet) ===");
    console.log(modifiedPrompt.substring(0, 500) + "\n...[truncated]...\n" + modifiedPrompt.substring(modifiedPrompt.length - 500));

    // 5. Send to Qwen
    const provider = new QwenProvider(config);
    console.log("\nSending Modified Request to Qwen...");
    
    try {
        const response = await provider._callApi('/api/v1/services/aigc/text-generation/generation', {
            input: {
                messages: [
                    { role: 'system', content: config.systemPrompts['zh'] || 'You are a helpful assistant.' },
                    { role: 'user', content: modifiedPrompt }
                ]
            },
            parameters: { result_format: 'message' }
        }, 'qwen-turbo');

        const result = response.output?.choices?.[0]?.message?.content;
        console.log("\n=== ANALYSIS RESULT ===");
        console.log(result);
        
    } catch (error) {
        console.error("API Call Failed:", error.message);
    }
    
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
