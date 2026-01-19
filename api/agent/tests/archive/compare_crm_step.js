const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const agentConfig = require('../config');
const crmConfig = require('../../crm/config');
const QwenProvider = require('../providers/qwen');
const GeminiProvider = require('../providers/gemini');

// Initialize Providers
const qwen = new QwenProvider({ ...agentConfig, language: 'zh' });
const gemini = new GeminiProvider({ ...agentConfig, language: 'en' });

async function runTest() {
    console.log('[Test] Starting CRM Step Comparison...');

    // 1. Read Inputs
    const testFile = path.join(__dirname, 'purpose_detect.txt');
    const inputs = fs.readFileSync(testFile, 'utf-8').split('\n').filter(l => l.trim());

    const results = [];

    // 2. Prepare Targets (CRM Only + Chat Fallback)
    const targets = {
        zh: {
            serviceDesc: crmConfig.description.zh.main.join(', '),
            methods: crmConfig.description.zh.methods
        },
        en: {
            serviceDesc: crmConfig.description.en.main.join(', '),
            methods: crmConfig.description.en.methods
        }
    };

    // 3. Loop Inputs
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        console.log(`\n[Case ${i+1}] Input: "${input}"`);

        // Test Qwen (ZH)
        const qwenRes = await testProvider('Qwen', qwen, input, targets.zh, 'zh');
        
        // Test Gemini (EN)
        const geminiRes = await testProvider('Gemini', gemini, input, targets.en, 'en');

        results.push({
            id: i + 1,
            input,
            qwen: qwenRes,
            gemini: geminiRes
        });
    }

    // 4. Generate Report
    generateMarkdown(results);
}

async function testProvider(name, provider, input, target, lang) {
    console.log(`  -> Testing ${name} (${lang})...`);
    const logs = { prompt1: '', result1: '', prompt2: '', result2: '' };
    
    // STEP 1: Is it CRM?
    const prompt1 = buildStep1Prompt(input, target.serviceDesc, lang);
    logs.prompt1 = prompt1;
    
    let isCrm = false;
    try {
        let res1;
        if (name === 'Qwen') {
            res1 = await provider._callApi('/api/v1/services/aigc/text-generation/generation', {
                input: { messages: [{ role: 'user', content: prompt1 }] },
                parameters: { result_format: 'message' }
            }, 'qwen-turbo');
            res1 = res1.output.choices[0].message.content;
        } else {
             const result = await provider.genAI.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent(prompt1);
             res1 = result.response.text();
        }
        logs.result1 = res1;
        
        if (extractJson(res1).includes('crm')) isCrm = true;
    } catch (e) {
        logs.result1 = `Error: ${e.message}`;
        return logs;
    }

    if (!isCrm) {
        logs.result2 = 'SKIPPED (Not CRM)';
        return logs;
    }

    // STEP 2: Which Method?
    const methodDesc = Object.entries(target.methods)
        .map(([k, v]) => `- ${k}: ${v.join('; ')}`)
        .join('\n');
        
    const prompt2 = buildStep2Prompt(input, methodDesc, lang);
    logs.prompt2 = prompt2;

    try {
        let res2;
         if (name === 'Qwen') {
            res2 = await provider._callApi('/api/v1/services/aigc/text-generation/generation', {
                input: { messages: [{ role: 'user', content: prompt2 }] },
                parameters: { result_format: 'message' }
            }, 'qwen-turbo');
            res2 = res2.output.choices[0].message.content;
        } else {
             const result = await provider.genAI.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent(prompt2);
             res2 = result.response.text();
        }
        logs.result2 = res2;
    } catch (e) {
        logs.result2 = `Error: ${e.message}`;
    }

    return logs;
}

function buildStep1Prompt(input, desc, lang) {
    if (lang === 'zh') {
        return `
请分析用户输入是否属于【客户关系管理(CRM)】领域。
【CRM功能描述】: ${desc}

用户输入: "${input}"

规则:
1. 如果相关，返回 ["crm"]
2. 如果不相关，返回 ["other"]
3. 仅返回JSON数组。
`;
    } else {
         return `
Analyze if the user input belongs to the [Customer Relationship Management (CRM)] domain.
[CRM Description]: ${desc}

User Input: "${input}"

Rules:
1. If relevant, return ["crm"]
2. If not, return ["other"]
3. Return ONLY a JSON array.
`;
    }
}

function buildStep2Prompt(input, methods, lang) {
     if (lang === 'zh') {
        return `
请从以下功能中选择最匹配的一项:
${methods}

用户输入: "${input}"

规则:
1. 返回匹配的键名数组，例如 ["crm.company.create"]
2. 如果无法匹配，返回 ["other"]
3. 仅返回JSON数组。
`;
    } else {
         return `
Select the most matching capability from the list:
${methods}

User Input: "${input}"

Rules:
1. Return an array of matching keys, e.g. ["crm.company.create"]
2. If no match, return ["other"]
3. Return ONLY a JSON array.
`;
    }
}

function extractJson(text) {
    try {
        const match = text.match(/\[.*?\]/s);
        return match ? JSON.parse(match[0]) : [];
    } catch (e) { return []; }
}

function generateMarkdown(results) {
    let md = `# CRM Single Purpose Test Results\nDate: ${new Date().toISOString().split('T')[0]}\n\n`;
    
    // Add Summary Table
    md += `## Summary Comparison\n\n`;
    md += `| Case | Input | Qwen (ZH) | Gemini (EN) | Status |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;

    results.forEach(r => {
        const qwenRes = extractJson(r.qwen.result2 || r.qwen.result1).join(', ') || 'N/A';
        const geminiRes = extractJson(r.gemini.result2 || r.gemini.result1).join(', ') || 'N/A';
        
        // Status Check (Simple check if they agree)
        let status = '❓ Diff';
        if (qwenRes === geminiRes) status = '✅ Agree';
        if (qwenRes.includes('other') && geminiRes.includes('other')) status = '✅ Both Skipped';

        // Escaping pipe characters for markdown table
        const cleanInput = r.input.replace(/\|/g, '\\|').substring(0, 50) + (r.input.length > 50 ? '...' : '');
        
        md += `| **${r.id}** | ${cleanInput} | \`${qwenRes}\` | \`${geminiRes}\` | ${status} |\n`;
    });
    
    md += `\n## Detailed Logs\n\n`;

    results.forEach(r => {
        md += `## Case ${r.id}\n**Input**: \`${r.input}\`\n\n`;
        
        md += `### Qwen (ZH)\n`;
        md += `**Step 1 Prompt**:\n\`\`\`\n${r.qwen.prompt1}\n\`\`\`\n`;
        md += `**Step 1 Result**: \`${r.qwen.result1}\`\n\n`;
        if (r.qwen.prompt2) {
             md += `**Step 2 Prompt**:\n\`\`\`\n${r.qwen.prompt2}\n\`\`\`\n`;
             md += `**Step 2 Result**: \`${r.qwen.result2}\`\n`;
        }
        
         md += `\n### Gemini (EN)\n`;
        md += `**Step 1 Prompt**:\n\`\`\`\n${r.gemini.prompt1}\n\`\`\`\n`;
        md += `**Step 1 Result**: \`${r.gemini.result1}\`\n\n`;
         if (r.gemini.prompt2) {
             md += `**Step 2 Prompt**:\n\`\`\`\n${r.gemini.prompt2}\n\`\`\`\n`;
             md += `**Step 2 Result**: \`${r.gemini.result2}\`\n`;
        }
        
        md += `\n---\n`;
    });
    
    console.log('--- OUTPUT START ---');
    console.log(md);
    console.log('--- OUTPUT END ---');
}

runTest();
