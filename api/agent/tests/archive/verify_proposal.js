const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const config = require('../config');
const QwenProvider = require('../providers/qwen');
const CapabilityManager = require('../CapabilityManager');

// Ensure API Key is present
if (!config.qwenApiKey && process.env.DASHSCOPE_API_KEY) {
    config.qwenApiKey = process.env.DASHSCOPE_API_KEY;
}

const qwen = new QwenProvider(config);

async function runVerification() {
    console.log('[Verify] Starting Two-Step Logic Verification...');

    // 1. Fetch Capabilities & Organize by Service
    console.log('[Verify] Fetching Capabilities...');
    const capabilities = await CapabilityManager.getCapabilities();
    
    // Group by Service
    const services = {};
    capabilities.forEach(cap => {
        // Assume key format "service.method" or "service.sub.method"
        // But the capability object doesn't always strictly follow dot-notation matching the service field?
        // Actually the raw redis data had "service" field. CapabilityManager logic:
        // this.capabilities = Object.entries(map).map(([key, val]) => ({ name: key, desc: ... }));
        // It lost the 'service' field in the map! 
        // Wait, I need to check CapabilityManager.js again. 
        // It maps: name, desc, params. It DOES NOT map 'service'.
        // I will need to infer service from the 'name' (first part of split '.') 
        // OR modify CapabilityManager (but user said "No changes").
        // I will infer from name for this test.
        
        const parts = cap.name.split('.');
        const serviceName = parts[0]; 
        
        if (!services[serviceName]) {
            services[serviceName] = {
                name: serviceName,
                descs: [],
                methods: []
            };
        }
        services[serviceName].descs.push(cap.desc);
        services[serviceName].methods.push(cap);
    });

    console.log(`[Verify] Grouped into ${Object.keys(services).length} services.`);

    // 2. Read Test Cases
    const testFile = path.join(__dirname, 'purpose_detect.txt');
    const content = fs.readFileSync(testFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');

    const results = [];

    // 3. Process
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        console.log(`\n[Case ${i + 1}] Input: "${line}"`);
        
        try {
            // STEP 1: Select Service
            const step1Start = Date.now();
            const serviceListText = Object.values(services).map(s => {
                // Summarize descs: Take top 5 unique words or just join first 3 descs?
                // Let's just join all descs for now, prompt might get long but manageable for partial list
                // Or better: "Service: [name], Capabilities: [desc1, desc2...]"
                const summary = s.descs.slice(0, 10).join(', '); 
                return `- ${s.name}: ${summary}`;
            }).join('\n');

            const prompt1 = `
你是一个意图分类助手。请根据用户输入，从以下服务列表中选出最相关的 **一个或多个** 服务。
【服务列表】
${serviceListText}
- agent: 通用对话、ID识别

【规则】
1. 返回相关的服务名称数组 (JSON格式)。
2. 如果是闲聊，返回 ["agent"]。

用户输入: "${line}"
`;
            
            // Call Qwen for Step 1
            const res1 = await qwen._callApi('/api/v1/services/aigc/text-generation/generation', {
                input: { messages: [{ role: 'user', content: prompt1 }] },
                parameters: { result_format: 'message' }
            }, 'qwen-turbo');

            const content1 = res1.output.choices[0].message.content;
            let selectedServices = [];
            try {
                const match = content1.match(/\[.*?\]/s);
                if (match) selectedServices = JSON.parse(match[0]);
            } catch (e) {
                console.warn('[Verify] Step 1 Parse Error:', content1);
            }

            console.log(`  -> Step 1 Selected: ${JSON.stringify(selectedServices)} (${Date.now() - step1Start}ms)`);

            // STEP 2: Select Methods from Selected Services
            if (selectedServices.length === 0) {
                 results.push({ input: line, step1: [], step2: [], note: "No service selected" });
                 continue;
            }

            const step2Start = Date.now();
            let relevantMethods = [];
            selectedServices.forEach(svcName => {
                if (services[svcName]) {
                    relevantMethods = relevantMethods.concat(services[svcName].methods);
                } else if (svcName === 'agent') {
                     if (services['agent']) relevantMethods = relevantMethods.concat(services['agent'].methods);
                }
            });

            const methodListText = relevantMethods.map(m => `- ${m.name}: ${m.desc}`).join('\n');
            const prompt2 = `
你是一个功能路由助手。请根据用户输入，从以下候选功能中选出最匹配的项。
【候选功能】
${methodListText}

【规则】
1. 返回匹配的功能键名数组 (JSON格式)。
2. 如果没有匹配项或属于闲聊，返回 ["agent.chat"]。

用户输入: "${line}"
`;

            const res2 = await qwen._callApi('/api/v1/services/aigc/text-generation/generation', {
                input: { messages: [{ role: 'user', content: prompt2 }] },
                parameters: { result_format: 'message' }
            }, 'qwen-turbo');
            
            const content2 = res2.output.choices[0].message.content;
            let finalMethods = [];
            try {
                const match = content2.match(/\[.*?\]/s);
                if (match) finalMethods = JSON.parse(match[0]);
            } catch (e) {
                console.warn('[Verify] Step 2 Parse Error:', content2);
            }
            
            console.log(`  -> Step 2 Final: ${JSON.stringify(finalMethods)} (${Date.now() - step2Start}ms)`);

            results.push({
                input: line,
                step1: selectedServices,
                step2: finalMethods
            });

        } catch (error) {
            console.error(`[Case ${i + 1}] Error:`, error.message);
        }
    }

    // Output Markdown
    const md = generateReport(results);
    console.log('\n--- REPORT START ---');
    console.log(md);
    console.log('--- REPORT END ---');
    
    if (CapabilityManager.redisClient.isOpen) await CapabilityManager.redisClient.quit();
}

function generateReport(results) {
    let md = `# Two-Step Logic Verification Results\n\n`;
    md += `| Case | Input | Step 1 (Services) | Step 2 (Methods) |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    
    results.forEach((r, i) => {
        const inputShort = r.input.length > 20 ? r.input.substring(0, 20) + '...' : r.input;
        md += `| ${i + 1} | ${inputShort} | \`${JSON.stringify(r.step1)}\` | \`${JSON.stringify(r.step2)}\` |\n`;
    });
    return md;
}

runVerification();
