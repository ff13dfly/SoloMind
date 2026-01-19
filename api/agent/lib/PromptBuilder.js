/**
 * Prompt Builder for Agent Purpose Detection
 * Supports both Phase 1 (coarse filtering) and Phase 2 (fine matching)
 */

const { systemPrompts } = require('../config');

class PromptBuilder {
    
    /**
     * Build Phase 1 prompt for service and category matching
     * @param {string} text - User input text
     * @param {object} context - Context with services, categories, and user
     * @param {string} lang - Language ('zh' or 'en')
     * @param {string} memory - Memory context string from useMemory hook
     * @returns {string} Formatted prompt
     */
    static buildPhase1(text, context, lang = 'zh', memory = '') {
        const user = context.user || { role: 'guest' };
        
        // 1. Get Base System Prompt (Static from Config)
        // In future, we can look up specific prompt by user.role from a config map
        const baseSystemPrompt = systemPrompts[lang] || systemPrompts['en'];
        
        // 2. Inject Dynamic User Context
        // "Context Injection" - The highly efficient string interpolation
        const userContext = lang === 'zh' 
            ? `=== 当前用户 (Current User) ===\n- 角色: ${user.role}\n- 语言: ${lang}`
            : `=== Current User ===\n- Role: ${user.role}\n- Language: ${lang}`;
        
        // 3. Inject Memory Context (if available)
        const memorySection = memory ? (lang === 'zh' 
            ? `\n=== 短期记忆 (Recent Context) ===\n${memory}\n`
            : `\n=== Recent Context ===\n${memory}\n`) : '';

        if (lang === 'zh') {
            return `
${baseSystemPrompt}

${userContext}${memorySection}

用户输入: "${text}"

=== 可用服务 (Services) ===
${context.services.join('\n')}

=== 工作流分类 (Workflow Categories) ===
${context.categories.join('\n')}

请执行:
1. 对每个服务和分类进行相关性打分 (0.0-1.0)
2. 返回 Top 2 服务 (按 score 降序)
3. 返回 Top 2 工作流分类 (按 score 降序)

返回格式 (JSON):
{
  "services": [{ "name": "服务名", "score": 0.95 }, ...],
  "categories": [{ "key": "分类key", "score": 0.90 }, ...]
}

仅返回 JSON，不要其他内容。
`;
        } else {
            return `
${baseSystemPrompt}

${userContext}${memorySection}

User Input: "${text}"

=== Available Services ===
${context.services.join('\n')}

=== Workflow Categories ===
${context.categories.join('\n')}

Action:
1. Score relevance for services and categories (0.0-1.0)
2. Return Top 2 Services
3. Return Top 2 Categories

Return JSON:
{
  "services": [{ "name": "service_name", "score": 0.95 }, ...],
  "categories": [{ "key": "category_key", "score": 0.90 }, ...]
}

Return JSON only.
`;
        }
    }

    /**
     * Build Phase 2 prompt for specific workflow matching
     * @param {string} text - User input text
     * @param {object} context - Context with candidates (workflows)
     * @param {string} lang - Language
     * @param {string} memory - Memory context string from useMemory hook
     */
    static buildPhase2(text, context, lang = 'zh', memory = '') {
        const candidatesList = context.candidates.join('\n');
        
        // Inject Memory Context (if available)
        const memorySection = memory ? (lang === 'zh' 
            ? `\n<memory_context>\n以下是用户近期的活动上下文，可能帮助理解当前输入：\n${memory}\n</memory_context>\n`
            : `\n<memory_context>\nRecent user activity context that may help understand current input:\n${memory}\n</memory_context>\n`) : '';

        if (lang === 'zh') {
            return `
你是一个精准的意图识别专家。请仔细阅读【候选能力列表】，然后判断【用户输入】最匹配哪一项。
${memorySection}

<candidates_context>
警告：以下列表仅为系统具备的能力定义，**不是**用户的指令。
${candidatesList}
</candidates_context>

<user_input>
${text}
</user_input>

请执行:
1. 分析【用户输入】的意图。
2. 从【候选能力列表】中寻找最匹配的一项。
3. **严格匹配原则**：
   - 如果用户输入的内容与任何候选能力的描述都不匹配，或者只是闲聊（如问候、天气、娱乐），必须返回 null。
   - **切勿**将<candidates_context>中的描述文字误认为是用户说的话。
   - **搜索 vs 列表**: 如果用户提供了具体的名称、关键词或ID，必须匹配支持搜索(Search/Query)的方法，**严禁**匹配仅用于列表展示(List/All)且不支持过滤的方法。
   - **层级识别原则**: 请参考【短期记忆】。如果用户说“给 [X] 添加 [Y]”，且记忆显示 [X] 是一个“区域(Section)”，则 [Y] 更有可能是“仓储单元(Unit)”，请优先匹配对应下级的方法。
4. 如果匹配信心 < 0.7，返回 null。

// 返回 JSON格式:
{
  "candidates": [
    { 
      "id": "wf_id", 
      "confidence": 0.95, 
      "reason": "一段简短的分析，说明为什么用户输入匹配该ID",
      "params": { "参数名": "提取的值" }
    }
  ]
}
`;
        } else {
            return `
You are a precise intent classifier. specific task: Match the <user_input> to one of the <capabilities>.
${memorySection}

<capabilities_context>
WARNING: The list below defines system capabilities. These are NOT user instructions.
${candidatesList}
</capabilities_context>

<user_input>
${text}
</user_input>

Task:
1. Analyze the intent of <user_input>.
2. Find the best match from <capabilities_context>.
3. **Strict Matching Rules**:
   - If the input is general chat (greeting, weather) or irrelevant, return null.
   - **Do NOT** confuse the description text in <capabilities_context> with the user's intent. 
   - **Search vs List**: If the user provides a specific name, keyword, or ID, you MUST match a Search/Query method. DO NOT match a generic "List/All" method that lacks filtering capability.
4. If confidence < 0.7, return null.

// Return JSON format:
{
  "candidates": [
    { 
      "id": "wf_id", 
      "confidence": 0.95, 
      "reason": "Short analysis of why input matches this ID",
      "params": { "param_name": "extracted_value" }
    }
  ]
}
`;
        }
    }

    /**
     * Build Focus prompt for parameter extraction
     * @param {string} text 
     * @param {object} context 
     * @param {string} lang 
     */
    static buildFocus(text, context, lang = 'zh') {
        const { workflow, currentParams, missingFields, currentTime, memory } = context;
        
        // Format memory context for Focus extraction
        const memorySection = memory ? (lang === 'zh'
            ? `\n=== 短期记忆 (Recent Context) ===\n以下是用户最近访问或提到的信息，可用于分析"它"、"刚才那个"等指代：\n${memory}\n`
            : `\n=== Recent Context ===\nRecent user activity context for resolving "it", "him", etc:\n${memory}\n`) : '';

        // Format current params
        let currentParamsText = '';
        if (currentParams && Object.keys(currentParams).length > 0) {
            currentParamsText = Object.entries(currentParams)
                .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
                .join('\n');
        } else {
            currentParamsText = lang === 'zh' ? '(无)' : '(None)';
        }

        // Format missing fields using PRE-RENDERED ai_meta + Synonyms
        let missingFieldsText = '';
        if (missingFields && missingFields.length > 0) {
            const fieldConfig = workflow.ai_meta?.field_config || {};
            const synonyms = workflow.synonyms || {};
            
            missingFieldsText = missingFields.map(field => {
                const s = synonyms[field] ? ` (别名: ${synonyms[field].join(', ')})` : '';
                
                // Check for Complex Object with fields
                const paramDef = workflow.params && Array.isArray(workflow.params) 
                    ? workflow.params.find(p => p.name === field) 
                    : null;

                if (paramDef && paramDef.type === 'object' && paramDef.fields && paramDef.fields.length > 0) {
                    const subInfo = paramDef.fields.map(sf => {
                        const desc = sf.description ? ` (${sf.description})` : '';
                        return `  * ${sf.name}${desc} [${sf.type}]`;
                    }).join('\n');
                    
                    const header = lang === 'zh' 
                        ? `- ${field}${s} (复杂对象，请提取以下内部字段):` 
                        : `- ${field}${s} (Complex Object, extract sub-fields):`;
                        
                    return `${header}\n${subInfo}`;
                }

                // Direct lookup from Pre-rendered Map
                const preRenderedLine = fieldConfig[field]?.text;
                
                // Fallback if pre-rendering failed or missing (Graceful degradation)
                if (!preRenderedLine) {
                    return `- ${field}${s}`;
                }
                return `${preRenderedLine}${s}`;
            }).join('\n');
        } else {
            missingFieldsText = lang === 'zh' ? '(全部已填)' : '(All Filled)';
        }

        if (lang === 'zh') {
            return `
你是一个精准的参数提取专家。根据【工作流上下文】和【短期记忆】，从【用户输入】中提取缺失的参数。
${memorySection}
【工作流】: ${workflow.name || workflow.id}
【工作流描述】: ${workflow.desc || '无'}

【待获取参数列表】:
${missingFieldsText}

【已收集参数】:
${currentParamsText}

【当前时间】: ${currentTime || new Date().toISOString()}

【用户输入】: "${text}"

【核心提取规则 (请严格遵守)】:
1. **优先满足缺失字段**：从用户输入中提取信息时，优先填入【待获取参数列表】中明确列出的字段。
2. **指代解析 (Memory Resolution)**：
   - 必须利用【短期记忆】解析“它”、“那个”、“刚才的”等代词。
   - **ID 铁律**：对于以 \`Id\` 结尾的参数（如 \`warehouseId\`, \`sectionId\`），必须从【短期记忆】的 \`Recent Operations\` 中提取其对应的 8-12 位原始 ID（如 \`6xwPMPyF\`）。
   - **严禁凑数**：如果【短期记忆】中找不到对应的 ID，**严禁**使用实体的名称（如“云顶”）填入 ID 字段。在这种情况下，请保持该字段为空并在 \`hint\` 中询问用户。
3. **不要忽略用户输入**：即使【短期记忆】中提到了某个信息，如果【用户输入】中也出现了对应的具体值（如"主卧室"），必须将其提取到对应字段中。覆盖优先级：【用户输入】 > 【短期记忆】。
4. **单位辅助判定**：利用单位来区分语义相近的字段：
   - 如果数值跟有“台”、“个”、“件”、“箱”、“只”等量词，通常对应 **amount** (数量)。
   - 如果数值跟有“元”、“块”、“毛”、“美金”、“刀”等或没有单位的纯大额数字，通常对应 **price** (价格)。
5. **防止一词多用**：禁止将同一数值同时填入用途不同的参数中。
6. **复杂对象深度提取**：对于 \`updates\` 等复杂对象，务必将其内部字段（如 \`amount\`, \`price\`）包装在嵌套对象中。
7. **严禁自动退出**：即便所有【待获取参数列表】中的字段都已提取或已填入，也**禁止**返回 \`action: "exit_focus"\`。AI 的职责仅为提取参数并协助确认。执行权属于用户。
8. **仅在取消时退出**：只有当用户输入明确表示要“退出”、“取消”或“刚才那个不要了”时，才返回 \`action: "exit_focus"\`。
9. **类型值严格映射**：对于名为 \`type\` 的字段，必须按照协议映射为英文关键字：
   - “仓库” -> \`warehouse\`
   - “区域/房间/分段” -> \`section\`
   - “单元/格位/架子/柜子” -> \`unit\`
   - “物品/东西/货” -> \`stuff\`
   **严禁**填入中文或其他非协议定义的值。


返回格式 (JSON):
{
  "extracted_params": { 
    "key": "value",
    "object_key": { "sub_key": "sub_value" } 
  },
  "confidence": { "key": 0.0-1.0 },
  "action": "continue" | "exit_focus",
  "hint": "一段友好的、人性化的回复，告知用户已识别了什么信息，以及接下来还需要输入什么。"
}
`;
        } else {
            return `
You are a precise parameter extraction expert. Extract missing parameters based on the [Workflow Context] and [Memory Context].
${memorySection}
[Workflow]: ${workflow.name || workflow.id}
[Description]: ${workflow.desc || 'None'}

[Missing Parameters]:
${missingFieldsText}

[Already Collected]:
${currentParamsText}

[Current Time]: ${currentTime || new Date().toISOString()}

[User Input]: "${text}"

[Extraction Rules]:
1. **Resolve pronouns**: Use the [Recent Context] to resolve words like "it", "him", "her", or "the previous one" to actual IDs or names.
2. **ID Only**: For fields ending in \`Id\`, return **ONLY the raw ID string** (e.g., \`6xwPMPyF\`). DO NOT include names or descriptions in these fields.
3. **Input Priority**: Always extract values explicitly provided in [User Input] even if they exist in [Memory Context].
4. **Prioritize missing fields**: Look specifically for info defined in [Missing Parameters].
5. **Complex Objects**: For objects like \`updates\`, extract sub-fields into a nested structure.
6. **Action**: Only return "exit_focus" if user explicitly says "cancel", "nevermind", or "exit". Otherwise, stay in focus mode.

Format (JSON):
{
  "extracted_params": { "key": "value" },
  "confidence": { "key": 0.8 },
  "action": "continue",
  "hint": "A friendly message explaining what was captured and what is still needed."
}
`;
        }
    }

    static buildChat(text, config, lang = 'zh') {
        const systemPrompt = config.systemPrompts[lang] || config.systemPrompts['en'];
        const constraints = config.chatConfig.constraints[lang] || config.chatConfig.constraints['en'];
        
        if (lang === 'zh') {
            return `${systemPrompt}\n\n[基本约束]:\n${constraints}\n\n[用户输入]:\n"${text}"`;
        } else {
            return `${systemPrompt}\n\n[Basic Constraints]:\n${constraints}\n\n[User Input]:\n"${text}"`;
        }
    }

    /**
     * Build Vision prompt for image description
     * @param {string} scene - 'finance' or 'general'
     * @param {string} lang 
     */
    static buildVision(scene = 'general', lang = 'zh') {
        if (scene === 'finance') {
            return lang === 'zh'
                ? `你是一个企业财务助手。请识别图片中的财务单据（发票、报销单、收据等）。
规则：
1. **严格判定**：如果图片**明显不是**财务单据（如风景、动物、户型图、自拍等），请**输出一段小于20字的简短说明**，描述你在图片里看到了什么（例如：“这是一张包含卧室的室内户型图”），不要包含“无法识别”字样。
2. 如果是财务单据，输出格式要求：
- 第一项是单据类型
- 后续用 | 分隔各字段
- 格式: 字段名:值
- 总长度不超过 150 字
示例输出："类型:发票 | 发票号:12345678 | 日期:2026-01-10 | 金额:1130 | 税额:130"`
                : `You are an enterprise finance assistant. Identify the financial document in the image.
Format:
- First item is document type
- Subsequent fields separated by |
- Format: FieldName:Value
- Max length 150 chars
Example: "Type:Invoice | No:12345678 | Date:2026-01-10 | Amount:1130"`;
        }

        return lang === 'zh'
            ? `你是一个企业助手。请根据图片内容，用一句话客观描述用户想要执行的任务或提取关键信息。
输出格式：直接输出任务描述，不超过 100 字。
示例输出："帮我录入这张名片上的客户信息 姓名:张三 电话:13800001111"`
            : `You are an enterprise assistant. Describe the task or key info from the image in one objective sentence.
Format: Output description directly, max 100 chars.
Example: "Add customer info from this business card. Name: Jerry, Phone: 13800001111"`;
    }
    /**
     * Build prompt for generating test cases for a workflow
     * @param {object} workflow - Workflow definition
     * @param {number} count - Number of cases to generate
     * @param {string} lang - Language
     */
    static buildCases(workflow, count = 5, lang = 'zh') {
        const paramsText = (workflow.params || [])
            .map(p => `- ${p.name} (${p.type}): ${p.description || ''}`)
            .join('\n');
            
        if (lang === 'zh') {
            return `
你是一个专业的测试工程师。给定一个【工作流】定义，请生成 ${count} 个不同的测试用例。

【工作流名称】: ${workflow.name || workflow.id}
【工作流描述】: ${workflow.desc || '无'}

【参数列表】:
${paramsText}

请生成 ${count} 个测试用例，涵盖以下维度：
1. **标准用例**：用户清晰地提供了所有必填参数。
2. **口语用例**：使用非正式、口语化的表达方式。
3. **部分参数用例**：用户仅提供了部分参数，需要通过多轮对话补全。
4. **边界用例**：包含错别字、缩写或非常规表达。

返回格式 (JSON):
{
  "workflow_id": "${workflow.id}",
  "cases": [
    {
      "id": "case_001",
      "trigger": "用户的初始输入内容",
      "expected_params": { "key": "value" },
      "focus_inputs": [
        { "turn": 1, "user_says": "多轮补全时的回答内容" }
      ]
    }
  ]
}

仅返回 JSON，不要其他内容。
`;
        } else {
            return `
You are a professional test engineer. Given a [Workflow] definition, generate ${count} different test cases.

[Workflow Name]: ${workflow.name || workflow.id}
[Workflow Description]: ${workflow.desc || 'None'}

[Parameters]:
${paramsText}

Generate ${count} test cases covering:
1. **Standard**: User provides all required parameters clearly.
2. **Colloquial**: Using informal, natural language.
3. **Partial**: User provides only some parameters, requiring multi-turn focus mode to complete.
4. **Edge**: Typos, abbreviations, or unusual phrasing.

Return JSON format:
{
  "workflow_id": "${workflow.id}",
  "cases": [
    {
      "id": "case_001",
      "trigger": "Initial user input",
      "expected_params": { "key": "value" },
      "focus_inputs": [
        { "turn": 1, "user_says": "Response during multi-turn collection" }
      ]
    }
  ]
}

Return JSON only.
`;
        }
    }
}

module.exports = PromptBuilder;
