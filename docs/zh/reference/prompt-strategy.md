# AI 提示词策略

> **状态**: 实现中  
> **版本**: 1.0

本文档描述如何将 AI 提示词（Prompt）的构建逻辑从运行时下沉到构建时，以提高 Agent 服务的响应速度。

## 核心收益

| 收益 | 说明 |
|------|------|
| **零硬编码** | Agent 端不再包含字段映射表，完全由数据驱动 |
| **构建简化** | 复杂逻辑在构建时处理，运行时复杂度降低 90% |
| **Token 可预估** | 可离线预计算每个工作流的 Token 消耗 |

## 工作流预渲染

### 核心理念

采用"计算下沉"策略：在 Orchestrator 构建工作流快照时，预先生成适合 AI 阅读的描述。Agent 在运行时只需做字符串替换。

### 数据结构

在 Redis 快照中新增 `ai_meta` 对象：

```json
{
  "id": "wf_123",
  "name": "资产盘点",
  "ai_meta": {
    "intent_desc": "- [ID: wf_123] [工作流: 资产盘点]: 对指定区域进行资产清点",
    "field_config": {
      "warehouse": "仓库 (又名: 库房, 存储点)",
      "section": "区域 (又名: 库区)",
      "count": "数量 (又名: 个数)"
    }
  }
}
```

### 构建逻辑

```javascript
function buildAiMeta(workflow) {
  // 1. 预渲染意图描述
  const intentDesc = `- [ID: ${workflow.id}] [工作流: ${workflow.name}]: ${workflow.desc}`;

  // 2. 预渲染字段配置
  const fieldConfig = {};
  const inputs = [...(workflow.required_inputs || [])];
  
  inputs.forEach(field => {
    const synList = workflow.synonyms?.[field] || [];
    const synHint = synList.length > 0 
      ? ` (说明: ${synList[0]}, 又名: ${synList.join(', ')})` 
      : '';
    fieldConfig[field] = `- ${field}${synHint}`;
  });

  return { intent_desc: intentDesc, field_config: fieldConfig };
}
```

## 用户上下文过滤

### 动态过滤

Agent 根据用户的**角色**和**权限**过滤可见的能力和工作流：

```javascript
// 输入
const userRoles = ['warehouse_manager'];
const userPermissions = ['asset.read', 'asset.write'];

// 过滤逻辑
const filteredWorkflows = workflows.filter(wf => 
  hasPermission(userPermissions, wf.required_permissions)
);
```

### 角色提示词

将用户角色注入 System Prompt：

| 角色 | 提示词示例 |
|------|-----------|
| 仓库管理员 | "你正在协助【仓库管理员】，专注于库存准确性。" |
| 财务专员 | "你正在协助【财务专员】，注意金额精确度。" |

**效果**：
- 聚焦场景，减少 AI 幻觉
- 双重安全防御（物理过滤 + 心理暗示）

## 元能力预渲染

### 数据聚合

Router 作为注册中心，聚合所有服务的元数据：

```javascript
function buildCapabilityMeta(serviceName, methods, config) {
  return methods.map(method => {
    const desc = config.description?.[method.name] || method.desc;
    return `- [API: ${method.name}]: ${desc}`;
  });
}
```

### 存储快照

```json
// AGENT:CAPABILITY_SNAPSHOT
[
  "- [API: crm.customer.add]: 创建新客户",
  "- [API: asset.section.list]: 查询区域列表"
]
```

## 多语言适配

### 构建时

为每种语言生成独立快照：

```
AGENT:WORKFLOW_SNAPSHOT:ZH  → 中文
AGENT:WORKFLOW_SNAPSHOT:EN  → 英文
```

### 运行时

根据用户语言偏好读取对应快照：

```javascript
const lang = user.language || 'zh';
const snapshot = await redis.get(`AGENT:WORKFLOW_SNAPSHOT:${lang.toUpperCase()}`);
```

## 缓存更新触发

| 触发场景 | 执行动作 |
|----------|----------|
| 工作流保存/发布 | Orchestrator 重新构建快照 |
| 服务启动/配置热加载 | Router 重新聚合元数据 |

## Token 计数

### 标准

使用 `字符数 / 3` 作为通用预估基准。

### 存储

```json
{
  "ai_meta": {
    "intent_desc": "...",
    "intent_tokens": 45,
    "field_config": {
      "warehouse": "...",
      "warehouse_tokens": 12
    }
  }
}
```

### 应用

```javascript
const totalTokens = systemPromptTokens + candidates.reduce(
  (sum, c) => sum + c.ai_meta.intent_tokens, 0
);

if (totalTokens > contextLimit) {
  // 激进过滤或截断
}
```
