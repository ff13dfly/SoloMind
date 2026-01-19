# AI 测试协议 (AI Test Protocol)

---

> **协议版本**: 1.0.0  
> **状态**: 草案 (Draft)  
> **作者**: Fuu  
> **许可证**: Apache 2.0

---

## 摘要

本协议定义了一套标准化流程，用于自动测试工作流准确率，通过 AI 生成测试用例并验证执行结果。

## 1. 简介

### 1.1 目的

本协议旨在实现"AI 自测 AI"的闭环验证机制，自动评估工作流的意图匹配和参数提取准确率。

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| **闭环验证** | 生成 → 执行 → 校验 → 改进 |
| **自动化** | AI 生成测试用例和期望结果 |
| **可追溯** | 完整记录执行链路 |

## 2. 术语定义

| 术语 | 定义 |
|------|------|
| **cases.json** | 测试用例集 |
| **result.json** | 期望结果定义 |
| **request.json** | 执行链路追踪 |

---

## 3. 概述

本协议实现了一个闭环自动化测试系统：

```
┌─────────────────────────────────────────────────────────────────┐
│  AI 测试闭环 (AI 自测 AI)                                          │
│                                                                 │
│  1. 生成 → 2. 预测 → 3. 执行 → 4. 校验 → 5. 改进                     │
│     cases.json   result.json   request.json   准确率   优化建议     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 数据结构

### 2.1 `cases.json` (测试用例集)

根据工作流的 `description`、`examples` 和 `required_inputs` 生成。

```json
{
  "workflow_id": "employee_onboarding_v1",
  "cases": [
    {
      "id": "case_001",
      "trigger": "新来一个员工 张三 电话13800001111 研发部工程师",
      "focus_inputs": [
        { "turn": 1, "user_says": "对" },
        { "turn": 2, "user_says": "工位在A区吧" }
      ],
      "expected_params": {
        "name": "张三",
        "phone": "13800001111",
        "department": "研发部",
        "position": "工程师"
      }
    }
  ]
}
```

### 2.2 `result.json` (期望结果)

定义执行成功后 Redis 中应有的数据。

```json
{
  "case_001": {
    "redis_keys": [
      {
        "pattern": "EMP:*",
        "expected_fields": {
          "name": "张三",
          "phone": "13800001111"
        }
      },
      {
        "pattern": "USR:*",
        "expected_fields": {
          "role": "USER"
        }
      }
    ]
  }
}
```

### 2.3 `request.json` (执行链路追踪)

捕获完整的 API 交互，用于调试和改进建议。

```json
{
  "case_001": {
    "trace": [
      { "step": "intent_match", "input": "...", "output": { "workflow_id": "..." } },
      { "step": "focus_turn_1", "input": "...", "output": { "params": {}, "missing": [] } },
      { "step": "execute", "result": "success" }
    ],
    "actual_redis": { ... },
    "match_score": 0.95
  }
}
```

---

## 3. 可行性分析

| 步骤 | 输入 | 输出 | 可行性 | 风险 |
|:---|:---|:---|:---:|:---|
| **生成测试用例** | Workflow JSON | `cases.json` | **95%** | AI 可能生成的边缘 case 不够全面。 |
| **预测期望结果** | Workflow Steps | `result.json` | **90%** | 需要理解 Workflow 的最终副作用。 |
| **执行测试** | `cases.json` | `request.json` | **100%** | 纯工程化 (HTTP + 状态机)。 |
| **校验数据** | Redis vs `result.json` | 准确率 | **85%** | 定义 "正确" 需要精确的 Schema 断言。 |
| **生成改进建议** | `request.json` + 准确率 | Prompt 优化建议 | **75%** | 需要 AI 具备自我反思能力。 |

---

## 4. 目标命令接口

```
用户: 测试 workflow[employee_onboarding_v1] 有效率，执行 5 次

AI 执行步骤:
1. [生成] 根据 Workflow 的 description 和 examples，生成 5 条 cases.json
2. [预测] 根据 Workflow 的 steps 和 params，预测 result.json
3. [执行] 启动 AI_test.js，模拟 5 次 Focus 对话，记录 request.json
4. [校验] 对比 Redis 落地数据 vs result.json，计算准确率
5. [反思] 如果准确率 < 100%，分析失败 case，给出 Prompt 优化建议

AI 输出:
-----------------------------------------
| Case ID   | 触发匹配 | 参数正确 | Redis 正确 | 总体 |
|-----------|----------|----------|------------|------|
| case_001  | ✓        | ✓        | ✓          | PASS |
| case_002  | ✓        | ✗ (phone)| N/A        | FAIL |
-----------------------------------------
准确率: 80% (4/5)

[改进建议]:
- case_002 失败原因: 用户说 "电话号是xxx" 但 Prompt 没有匹配 "电话号" 这种变体。
- 建议在 Workflow examples 中增加: "电话号13800001111"
```

---

## 5. 实现阶段

### Phase 1 (MVP 版本)
- 实现 `AI_test.js` 测试基座，能真实调用 API。
- 从 `cases.json` 读取测试用例，与 `result.json` 对比校验。
- **人工**维护测试用例和期望结果。

### Phase 2 (自动化版本)
- AI **自动生成** `cases.json` 和 `result.json`。
- AI 分析失败 case 并**自动生成** Prompt 优化建议。
- (终极目标) AI **自动修改** Workflow 配置并重新测试，形成完整闭环。

---

## 6. 测试基座: `AI_test.js`

位于 `api/tests/AI_test.js`，该脚本功能：

1. 加载目标 Workflow 的 `cases.json`。
2. 模拟 Focus 模式状态机 (意图识别 → Focus 填槽 → 执行)。
3. 通过 `api/router` 调用真实 API。
4. 捕获所有请求/响应对，保存到 `request.json`。
5. 查询 Redis 获取最终数据状态。
6. 与 `result.json` 对比，输出准确率报告。

---

## 7. 文件位置

| 文件 | 路径 | 描述 |
|:---|:---|:---|
| `cases.json` | `api/tests/fixtures/{workflow_id}/cases.json` | 测试用例定义 |
| `result.json` | `api/tests/fixtures/{workflow_id}/result.json` | 期望结果 |
| `request.json` | `api/tests/output/{workflow_id}/request.json` | 执行链路追踪 |
| `AI_test.js` | `api/tests/AI_test.js` | 测试基座 |

---

## 8. 终极愿景：Prompt-to-Workflow (从描述到工作流)

Phase 2 完成后，系统将实现 **"Prompt-to-Workflow"**：用自然语言描述功能，AI 自动生成可用的工作流。

### 示例交互

```
用户: 我需要一个"客户合同续签"的流程。
      步骤：查客户信息 → 检查有没有欠款 → 生成新合同 → 发邮件提醒

AI 执行:
[第 1 轮: 草稿生成]
AI: 根据您的描述，生成了 Workflow 草稿：contract_renewal_v1.json

[第 2 轮: 自动测试]
AI: 正在生成 5 条测试用例... ✓
    正在执行测试...
    准确率: 40% (2/5)

[第 3 轮: 自动修复]
AI: 分析失败原因：
    - case_1: "检查欠款" 步骤用了 customer_name 而不是 customer_id。
    - case_3: 触发语句 "续合同" 没有被识别，examples 里缺少这个说法。

    正在自动修复 Workflow...
    - 修复 1: 增加 Resolver，将 customer_name 转换为 customer_id。
    - 修复 2: 在 examples 中增加 "续合同", "合同续期"。

[第 4 轮: 再次测试]
AI: 重新执行 5 条测试...
    准确率: 100% (5/5) ✓

[最终输出]
AI: Workflow "contract_renewal_v1" 已就绪！
    触发方式：
    - "帮我续签 XX 公司的合同"
    - "XX 客户的合同到期了，续一下"
```

### 角色转变

| 之前 | Phase 2 之后 |
|:---|:---|
| 您是 **Workflow 开发者** | 您变成 **Workflow 审核者** |
| 手写 JSON，手动测试，反复迭代 | 用自然语言描述，AI 自动迭代 |
| 自己调试失败原因 | AI 自动诊断并修复 |

---

## 9. 详细实现路线图

### Phase 1: 手动测试基础 (第 1-2 周)
| 任务 | 描述 | 交付物 |
|:---|:---|:---|
| 构建 `AI_test.js` | 实现真实 API 调用的测试基座 | 可运行脚本 |
| 定义 Schema | `cases.json` + `result.json` 格式规范 | 文档化的 Schema |
| 首个 Workflow 测试 | 测试 `employee_onboarding_v1` | 准确率报告 |
| Redis 校验 | 对比实际数据与期望数据 | Diff 工具 |

### Phase 2: AI 生成测试 (第 3-4 周)
| 任务 | 描述 | 交付物 |
|:---|:---|:---|
| 用例生成器 | AI 从 Workflow 生成 `cases.json` | Prompt 模板 |
| 结果预测器 | AI 从 Steps 生成 `result.json` | Prompt 模板 |
| 失败分析器 | AI 从 `request.json` 识别根因 | 诊断报告 |
| 建议生成器 | AI 输出 Prompt/配置改进建议 | 可执行修复 |

### Phase 3: 闭环优化 (第 5 周+)
| 任务 | 描述 | 交付物 |
|:---|:---|:---|
| 自动修复引擎 | AI 修改 Workflow 并重新测试 | 自愈循环 |
| 回滚保护 | 如果准确率下降则回滚 | 版本控制 |
| Human-in-Loop | 生产前最终审批 | 审核关卡 |
| **Prompt-to-Workflow** | 描述功能 → 获得可用 Workflow | 终极目标 |

---

## 10. Phase 2 详细实现方案

本章节提供 Phase 2 的完整实现规范。

### 10.1 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Phase 2 架构                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐    │
│  │ portal/system│     │ AI 测试      │     │ Redis                │    │
│  │ (UI)         │────▶│ 微服务        │────▶│ (Workflows + Logs)   │    │
│  └──────────────┘     └──────────────┘     └──────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│                       ┌──────────────┐                                 │
│                       │ LLM 提供商    │                                 │
│                       │ (Qwen/GPT)   │                                 │
│                       └──────────────┘                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 system.md 自动生成

#### 10.2.1 目的
`system.md` 是一个全面描述系统能力的文档，使 AI 能够生成准确的测试用例。

#### 10.2.2 数据来源

| 来源 | 数据类型 | 提取方法 |
|:---|:---|:---|
| Redis `WF:*` | Workflow 定义 | `JSON.GET WF:*` |
| Redis `CAP:*` | Capability 定义 | `JSON.GET CAP:*` |
| Redis `LOG:*` | 用户输入日志 | `FT.SEARCH idx:logs` |
| `rpc_registry.js` | API 方法定义 | 解析 JS AST |

#### 10.2.3 system.md 结构模板

```markdown
# 系统上下文 - 用于 AI 测试用例生成

## 1. 系统概述
[自动生成的系统描述]

## 2. 能力注册表
| 能力 ID | 名称 | 描述 |
|:---|:---|:---|
| {cap.id} | {cap.name} | {cap.desc} |

## 3. 能力详情

### {capability.id}
**描述**: {capability.desc}
**必填参数**:
  - {param.name} ({param.type}): {param.desc}
**可选参数**:
  - {param.name} ({param.type}): {param.desc}
**用户表达示例** (从日志挖掘):
  - "{log.input_1}"
  - "{log.input_2}"
  - "{log.input_3}"
**易混淆场景**:
  - "{similar_intent}" → 应匹配 {other_capability}

## 4. 测试用例生成规则
[指导 AI 如何生成多样化测试用例]

## 5. 输出格式规范
[cases.json 的 JSON Schema]
```

#### 10.2.4 生成脚本

位置: `api/tests/lib/SystemMdGenerator.js`

```javascript
class SystemMdGenerator {
  constructor(redis) {
    this.redis = redis;
  }

  async generate() {
    // 1. 加载所有 Workflow
    const workflows = await this.loadWorkflows();
    
    // 2. 加载所有 Capability
    const capabilities = await this.loadCapabilities();
    
    // 3. 从日志挖掘用户表达
    const expressions = await this.mineExpressions();
    
    // 4. 生成 Markdown
    return this.buildMarkdown(workflows, capabilities, expressions);
  }

  async loadWorkflows() {
    const keys = await this.redis.keys('WF:*');
    return Promise.all(keys.map(k => 
      this.redis.call('JSON.GET', k).then(JSON.parse)
    ));
  }

  async mineExpressions(capabilityId, limit = 20) {
    // 查询成功匹配的日志
    const logs = await this.redis.call('FT.SEARCH', 'idx:logs',
      `@matched_capability:{${capabilityId}} @success:{true}`,
      'LIMIT', 0, limit
    );
    
    // 提取唯一表达
    return [...new Set(logs.map(l => l.input))];
  }

  buildMarkdown(workflows, capabilities, expressions) {
    let md = `# 系统上下文 - 用于 AI 测试用例生成\n\n`;
    md += `## 1. 系统概述\n`;
    md += `这是一个企业级 AI Agent 系统。用户通过自然语言下达指令，`;
    md += `系统自动匹配并执行相应的 Workflow。\n\n`;
    
    md += `## 2. 能力注册表\n`;
    md += `| 能力 ID | 名称 | 描述 |\n`;
    md += `|:---|:---|:---|\n`;
    for (const cap of capabilities) {
      md += `| ${cap.id} | ${cap.name} | ${cap.desc} |\n`;
    }
    
    md += `\n## 3. 能力详情\n\n`;
    for (const cap of capabilities) {
      md += `### ${cap.id}\n`;
      md += `**描述**: ${cap.desc}\n`;
      md += `**必填参数**:\n`;
      for (const [name, schema] of Object.entries(cap.required_inputs || {})) {
        md += `  - ${name} (${schema.type}): ${schema.desc}\n`;
      }
      
      const examples = expressions[cap.id] || cap.examples || [];
      if (examples.length > 0) {
        md += `**用户表达示例**:\n`;
        for (const ex of examples.slice(0, 10)) {
          md += `  - "${ex}"\n`;
        }
      }
      md += `\n`;
    }
    
    md += `## 4. 测试用例生成规则\n`;
    md += `1. 覆盖标准表达 (明确关键词如"入职"、"预订")\n`;
    md += `2. 覆盖口语化表达 ("来了个新人"、"订个会议室")\n`;
    md += `3. 覆盖参数缺失场景 (只有名字,没有电话)\n`;
    md += `4. 覆盖边缘情况 (空输入、特殊字符)\n`;
    md += `5. 不要生成应该匹配其他 Workflow 的混淆场景\n\n`;
    
    md += `## 5. 输出格式\n`;
    md += `生成 JSON 格式测试用例:\n`;
    md += `\`\`\`json\n`;
    md += `{\n`;
    md += `  "cases": [\n`;
    md += `    {\n`;
    md += `      "id": "case_001",\n`;
    md += `      "trigger": "自然语言用户输入",\n`;
    md += `      "expected_capability": "capability.id"\n`;
    md += `    }\n`;
    md += `  ]\n`;
    md += `}\n`;
    md += `\`\`\`\n`;
    
    return md;
  }
}

module.exports = SystemMdGenerator;
```

### 10.3 cases.json AI 生成

#### 10.3.1 AI Prompt 模板

```
你是一个企业 AI 系统的测试用例生成器。

给定系统上下文 (system.md) 和目标 Workflow ID，
生成多样化的测试用例,覆盖:
1. 带完整参数的标准表达
2. 口语化/非正式表达
3. 部分参数输入
4. 边缘情况 (错别字、缩写)

系统上下文:
---
{system_md_content}
---

目标 Workflow: {workflow_id}
用例数量: {count}

严格输出 JSON 格式:
{
  "workflow_id": "{workflow_id}",
  "cases": [
    {
      "id": "case_001",
      "trigger": "...",
      "expected_capability": "...",
      "expected_params": { ... }
    }
  ]
}
```

#### 10.3.2 生成参数

| 参数 | 默认值 | 描述 |
|:---|:---:|:---|
| `count` | 20 | 生成的测试用例数量 |
| `coverage_mode` | `balanced` | `standard`、`colloquial`、`edge` 或 `balanced` |
| `language` | `zh-CN` | 测试表达的语言 |
| `include_negative` | `false` | 是否包含不应匹配的用例 |

### 10.4 AI 测试微服务

#### 10.4.1 服务定义

位置: `api/tester/` (新微服务)

```
api/tester/
├── index.js           # 服务入口 (端口 3840)
├── rpc_registry.js    # RPC 方法定义
├── handlers/
│   ├── generate.js    # 生成测试用例
│   ├── execute.js     # 执行测试
│   └── report.js      # 生成报告
├── lib/
│   ├── SystemMdGenerator.js
│   ├── CaseGenerator.js
│   └── TestExecutor.js
└── package.json
```

#### 10.4.2 RPC 方法

| 方法 | 参数 | 响应 | 描述 |
|:---|:---|:---|:---|
| `tester.generate` | `workflow_id`, `count` | `{ cases: [...] }` | 生成测试用例 |
| `tester.execute` | `workflow_id`, `times` | `{ job_id }` | 启动异步测试任务 |
| `tester.status` | `job_id` | `{ progress, results }` | 获取任务状态 |
| `tester.report` | `job_id` | `{ accuracy, details }` | 获取最终报告 |
| `tester.system_md` | - | `{ markdown }` | 获取当前 system.md |

#### 10.4.3 API 接口规范

**生成测试用例**
```javascript
// 请求
{
  "jsonrpc": "2.0",
  "method": "tester.generate",
  "params": {
    "workflow_id": "employee_onboarding_v1",
    "count": 20,
    "coverage_mode": "balanced"
  },
  "id": 1
}

// 响应
{
  "jsonrpc": "2.0",
  "result": {
    "cases": [
      { "id": "case_001", "trigger": "...", "expected_capability": "..." },
      // ... 另外 19 条用例
    ],
    "generation_time_ms": 1234
  },
  "id": 1
}
```

**执行测试**
```javascript
// 请求
{
  "jsonrpc": "2.0",
  "method": "tester.execute",
  "params": {
    "workflow_id": "employee_onboarding_v1",
    "times": 100
  },
  "id": 2
}

// 响应
{
  "jsonrpc": "2.0",
  "result": {
    "job_id": "test_job_20260111_193000",
    "status": "running",
    "total_cases": 100
  },
  "id": 2
}
```

**获取状态 (WebSocket 实时更新)**
```javascript
// WebSocket 消息
{
  "type": "progress",
  "job_id": "test_job_20260111_193000",
  "data": {
    "completed": 45,
    "total": 100,
    "passed": 42,
    "failed": 3,
    "current_case": "case_046"
  }
}
```

**获取报告**
```javascript
// 请求
{
  "jsonrpc": "2.0",
  "method": "tester.report",
  "params": {
    "job_id": "test_job_20260111_193000"
  },
  "id": 3
}

// 响应
{
  "jsonrpc": "2.0",
  "result": {
    "accuracy": 0.90,
    "passed": 90,
    "failed": 10,
    "duration_ms": 120000,
    "details": [
      { "id": "case_011", "status": "FAIL", "reason": "意图不匹配" },
      // ... 其他失败用例
    ],
    "suggestions": [
      "在 Workflow examples 中添加 '新进'",
      "处理 '今天有新人' 模式"
    ]
  },
  "id": 3
}
```

### 10.5 portal/system UI 集成

#### 10.5.1 新增 UI 组件

| 组件 | 位置 | 描述 |
|:---|:---|:---|
| `WorkflowTestPanel` | `pages/WorkflowManagement.tsx` | Workflow 编辑器中的测试面板 |
| `TestProgressBar` | `components/TestProgressBar.tsx` | 实时进度显示 |
| `TestReportCard` | `components/TestReportCard.tsx` | 准确率摘要卡片 |
| `FailureAnalysis` | `components/FailureAnalysis.tsx` | 详细失败分析 |

#### 10.5.2 用户流程

```
1. 用户打开 WorkflowManagement 页面
2. 用户选择一个 Workflow
3. 用户点击"测试 Workflow"按钮
4. 系统显示 TestPanel,包含选项:
   - 测试用例数量 (10/20/50/100)
   - 覆盖模式 (标准/口语化/边缘/全部)
5. 用户点击"开始测试"
6. 系统调用 tester.generate → tester.execute
7. UI 通过 WebSocket 显示实时进度
8. 完成后显示 TestReportCard:
   - 准确率百分比
   - 通过/失败分解
   - 失败分析
   - 改进建议
9. 用户可点击"应用建议"自动更新 Workflow
```

#### 10.5.3 UI 概念设计

```
┌─────────────────────────────────────────────────────────────────┐
│ Workflow: employee_onboarding_v1                    [编辑] [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────────────────────┐ │
│  │ 测试配置           │  │ 测试结果                           │ │
│  │                    │  │                                    │ │
│  │ 用例数: [50  ▼]    │  │  ████████████████████░░░░  90%     │ │
│  │                    │  │                                    │ │
│  │ 模式: [均衡  ▼]    │  │  ✅ 通过: 90                       │ │
│  │                    │  │  ❌ 失败: 10                       │ │
│  │ [▶ 开始测试]       │  │                                    │ │
│  └────────────────────┘  │  📋 查看详细报告                    │ │
│                          │                                    │ │
│                          │  ⚡ 应用 3 条建议                   │ │
│                          └────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.6 用户表达日志挖掘

#### 10.6.1 日志 Schema

```json
{
  "id": "LOG:20260111193000_abc123",
  "timestamp": "2026-01-11T19:30:00Z",
  "user_id": "USR:001",
  "input": "帮我入职一个新同事叫张三",
  "matched_capability": "company.employee.create",
  "confidence": 0.95,
  "success": true,
  "workflow_executed": "employee_onboarding_v1"
}
```

#### 10.6.2 挖掘逻辑

```javascript
async function mineUserExpressions(redis, capabilityId, options = {}) {
  const { limit = 50, minConfidence = 0.8, uniqueOnly = true } = options;
  
  // 搜索高置信度的成功匹配
  const query = `@matched_capability:{${capabilityId}} @success:{true} @confidence:[${minConfidence} 1.0]`;
  const results = await redis.call('FT.SEARCH', 'idx:logs', query, 
    'SORTBY', 'timestamp', 'DESC',
    'LIMIT', 0, limit * 2 // 获取额外数据用于去重
  );
  
  // 提取并去重表达
  const expressions = [];
  const seen = new Set();
  
  for (const doc of results) {
    const input = doc.input.trim().toLowerCase();
    const normalized = input.replace(/\d+/g, 'X'); // 规范化数字
    
    if (uniqueOnly && seen.has(normalized)) continue;
    seen.add(normalized);
    
    expressions.push({
      original: doc.input,
      normalized,
      confidence: doc.confidence,
      count: 1 // 可聚合计算频率
    });
    
    if (expressions.length >= limit) break;
  }
  
  return expressions;
}
```

### 10.7 冷启动策略

针对没有日志数据的新建 Workflow:

| 阶段 | 日志数量 | 策略 |
|:---|:---:|:---|
| **冷启动** | 0-10 | 使用开发者提供的示例 (要求至少 3 条) |
| **早期** | 10-100 | 混合: 50% 开发者示例 + 50% 挖掘日志 |
| **增长期** | 100-500 | 混合: 20% 开发者 + 80% 挖掘日志 |
| **成熟期** | 500+ | 100% 挖掘日志,按频率排序 |

### 10.8 错误处理

| 错误 | HTTP 状态码 | 恢复策略 |
|:---|:---:|:---|
| LLM 超时 | 504 | 重试,减少用例数量 |
| LLM 返回无效 JSON | 422 | 重试,使用更严格的 Prompt |
| Redis 连接失败 | 503 | 返回缓存的 system.md |
| 测试执行超时 | 408 | 返回部分结果 + 警告 |

### 10.9 成本估算

| 操作 | Token 用量 | 成本 (Qwen-Turbo) |
|:---|:---:|:---:|
| 生成 system.md | ~2000 | ~¥0.01 |
| 生成 20 条用例 | ~3000 | ~¥0.02 |
| 执行 100 条测试 | ~260,000 | ~¥1.00 |
| **单次测试总计** | | **~¥1.03** |

> **注意**: 执行测试会调用真实 AI API 进行意图识别,这是主要成本来源。

---

## 10. 成功指标

| 指标 | Phase 1 | Phase 2 | Phase 3 |
|:---|:---:|:---:|:---:|
| 测试自动化程度 | 0% | 80% | 100% |
| Workflow 创建时间 | 2+ 小时 | 30 分钟 | **5 分钟** |
| 人工投入 | 编写测试 | 审核测试 | **仅审核** |
| 准确率目标 | 70%+ | 90%+ | 100% |

---

## 11. 输入质量与输出准确率的关系

**核心原则**：描述的质量直接决定 Workflow 生成的成功率。

### 准确率对照表

| 输入质量 | 示例 | AI 准确率 | 所需迭代次数 |
|:---|:---|:---:|:---:|
| **模糊口语** | "帮我搞个入职流程" | 30% | 5+ 轮 |
| **简单描述** | "创建员工档案、开账号、发邮件" | 60% | 2-3 轮 |
| **结构化描述** | "步骤1: 调用 company.employee.create; 步骤2: ..." | 85% | 1 轮 |
| **完整规格书** | 包含: 触发词、参数定义、API 映射、边缘情况 | **98%** | **0 轮 (一次成功)** |

### 5 类关键信息

为获得最高生成准确率，请在描述中提供以下信息：

1.  **触发意图 (Trigger Intents)**
    *   ✅ 好: "用户可能说：'新员工入职'、'招了个人'、'来了个设计师'"
    *   ❌ 坏: "就是入职的流程"

2.  **输入参数 (Input Schema)**
    *   ✅ 好: "`name` (必填), `phone` (必填, 11位手机号), `department` (可选, 默认'未分配')"
    *   ❌ 坏: "就是员工信息"

3.  **步骤与 API 映射 (Step-to-API Mapping)**
    *   ✅ 好: "第一步调 `company.employee.create`，第二步调 `user.create`"
    *   ❌ 坏: "创建档案然后开账号"

4.  **数据关联 (Resolvers)**
    *   ✅ 好: "用户会说部门名称（如'研发部'），需要转成 departmentId"
    *   ❌ 坏: (完全没提)

5.  **边缘情况 (Edge Cases)**
    *   ✅ 好: "如果手机号已存在，提示'该手机号已被员工 XXX 使用'"
    *   ❌ 坏: (完全没提)

### 实际对比

**场景 A：模糊输入**
```
用户: 做一个请假流程
AI: [生成草稿] → 测试准确率 40% → [第2轮] → 50% → [第3轮] → 70%...
    (需要 5 轮迭代才能达到 90%)
```

**场景 B：详细说明**
```
用户:
请假流程:
- 触发词: "请假"、"我要请假"、"休假申请"
- 必填: employee_id (从登录态获取), start_date, end_date, reason
- 可选: type (年假/病假/事假, 默认事假)
- 步骤:
  1. agenda.leave.create (创建请假记录)
  2. notification.send (通知直属上级审批)
- 边缘: 如果请假天数 > 3，需要 HR 额外审批

AI: [生成草稿] → 测试准确率 95% → ✓ 一次成功
```

### 核心洞见

> **在 Phase 2 时代，文档即编程。**
> 
> 您提供的"说明"就是新的"源代码"——只不过它是人类语言，而不是 JSON。
> 
> - **降低门槛**：业务人员只要能写清楚需求文档，就能"开发" Workflow。
> - **AI 作为翻译器**：AI 的角色是把"人话"翻译成"系统能执行的 JSON"。
> - **文档质量 = 代码质量**：如果说明不清楚，生成的 Workflow 就会有 Bug。
