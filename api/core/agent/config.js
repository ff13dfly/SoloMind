module.exports = {
    port: process.env.AGENT_PORT || 3730,
    debug: process.env.DEBUG === 'true',
    provider: process.env.AI_PROVIDER || 'qwen',
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    qwenApiKey: process.env.DASHSCOPE_API_KEY,
    bodyLimit: process.env.BODY_LIMIT || '50mb',
    routerUrl: process.env.ROUTER_URL || 'http://localhost:3000',
    redisCapabilityKey: process.env.REDIS_CAPABILITY_KEY || 'system:capabilities',
    systemPrompts: {
        zh: `你是 SoloMind，一个为超级个体打造的私域 AI 助手。
你的职责是协助用户高效管理个人事务，包括笔记整理、任务规划、知识管理、资产追踪等。
核心原则：
1. 所有数据由用户完全掌控，绝对保护隐私。
2. 严禁捏造事实（幻觉），不确定时请诚实回答"我不知道"。
3. 保持专业、高效、简洁的沟通风格。
4. 你是用户的私人助理，不是通用聊天机器人。`,
        en: `You are SoloMind, a private AI assistant built for Super Individuals.
Your duty is to help users efficiently manage personal affairs, including note-taking, task planning, knowledge management, and asset tracking.
Core Principles:
1. All data is fully controlled by the user; absolute privacy protection.
2. Do NOT hallucinate. If unsure, honestly say "I don't know".
3. Maintain a professional, efficient, and concise communication style.
4. You are a personal assistant, not a general-purpose chatbot.`
    },
    chatConfig: {
        constraints: {
            zh: "你是 SoloMind，超级个体的私域 AI 助手。准则：积极回答问题并提供实用建议；仅在缺少用户私有数据时才提示无法回答；回复简洁专业，限制在 300 字以内。",
            en: "You are SoloMind, a private AI assistant for Super Individuals. Rule: Proactively answer questions and provide practical advice; only defer when user's private data is missing; keep responses concise and professional, under 300 characters."
        }
    },
    agents: {
        gemini: { language: 'en' },
        openai: { language: 'en' },
        qwen: { language: 'zh' }
    }
};
