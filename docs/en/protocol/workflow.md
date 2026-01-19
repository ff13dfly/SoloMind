# AI 工作流协议 (AI Workflow Protocol)

---

> **协议版本**: 1.0.0  
> **状态**: 稳定 (Stable)  
> **作者**: Fuu  
> **许可证**: Apache 2.0

---

## 摘要

本协议定义了 SoloMind 系统中 AI 驱动工作流的完整生命周期，涵盖工作流定义、参数收集（Focus 状态机）和子任务分发三个核心环节。

## 1. 简介

### 1.1 设计目标

| 目标 | 说明 |
|------|------|
| **声明式定义** | 通过 JSON 描述工作流，无需编码 |
| **AI 意图匹配** | 自然语言触发工作流执行 |
| **渐进式补全** | 多轮对话收集缺失参数 |
| **确定性执行** | 编排器按顺序执行步骤 |

### 1.2 核心概念

| 概念 | 描述 |
|------|------|
| **Workflow** | 存储在 Redis 中的命名步骤序列 |
| **Focus 状态** | 前端锁定当前任务，等待参数补全 |
| **Task** | 子服务调用任务，由 Router 分发 |
| **Context ($)** | 贯穿所有步骤的全局状态对象 |

### 1.3 执行流程概览

```
用户输入 → 意图匹配 → 工作流命中 → Focus 补全 → 确认执行 → 步骤执行 → 子任务分发
```

## 2. 工作流定义

### 2.1 数据结构

**Redis Key**: `orchestrator:workflow:{id}`

```json
{
  "id": "meeting_setup_v1",
  "category": "协作类",
  "priority": 80,
  "name": "安排项目会议",
  "desc": "创建日历事件，预订会议室，并通知团队。",
  "tags": ["会议", "日历", "通知"],
  "examples": ["帮我订个会", "约一下明天的同步会"],
  "negative": ["取消会议", "删除日程"],
  "required_inputs": ["roomId", "startTime"],
  "optional_inputs": ["title", "duration"],
  "synonyms": { "roomId": ["会议室", "小红屋"] },
  "defaults": { "duration": 60, "platform": "Zoom" },
  "auto": false,
  "steps": [
    {
      "id": "book_room",
      "service": "asset",
      "method": "asset.unit.reserve",
      "params": { "unitId": "$input.roomId" }
    }
  ]
}
```

### 2.2 字段定义

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符 |
| `category` | string | ✅ | 分类，用于两段式匹配 |
| `name` | string | ✅ | 人类可读名称 |
| `desc` | string | ✅ | 详细描述，用于语义搜索 |
| `examples` | string[] | ❌ | 触发短语示例 |
| `negative` | string[] | ❌ | 反向约束，降低误匹配 |
| `required_inputs` | string[] | ❌ | 必填参数列表 |
| `defaults` | object | ❌ | 默认值 |
| `auto` | boolean | ❌ | 参数完整时自动执行 |
| `steps` | Step[] | ✅ | 步骤列表 |

### 2.3 Step 对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 步骤标识，用于 `$step.{id}.result` |
| `service` | string | ✅ | 目标微服务 |
| `method` | string | ✅ | 调用方法 |
| `params` | object | ✅ | 参数，支持 `$` 变量 |
| `condition` | string | ❌ | 条件表达式 |
| `ignore_error` | boolean | ❌ | 失败时继续 |

### 2.4 变量解析

| 前缀 | 来源 | 示例 |
|------|------|------|
| `$input` | 用户输入 | `$input.startTime` |
| `$config` | defaults + input | `$config.duration` |
| `$step` | 前序步骤结果 | `$step.book_room.result.id` |
| `$resolved` | Resolver 解析结果 | `$resolved.companyId` |

### 2.5 Resolver (名称解析)

将用户友好的名称转换为系统 ID：

```json
"resolvers": {
  "companyId": {
    "source": "companyName",
    "service": "company",
    "method": "company.info",
    "params": { "name": "$val" },
    "resultPath": "id"
  }
}
```

## 3. Focus 状态机

### 3.1 核心概念

| 概念 | 描述 |
|------|------|
| **Focus 状态** | 前端锁定当前任务，等待数据补全 |
| **单一锁定** | 一次只处理一个 Workflow |
| **摘要卡片** | 实时显示已填/待填字段 |
| **渐进式补全** | 多轮对话收集必填字段 |

> [!IMPORTANT]
> **无状态原则**: `agent.focus` 接口不维护会话状态，所有上下文由客户端传入。

### 3.2 状态流转

```
Idle → [命中 Workflow] → Collecting → [数据完整] → Pending → [确认] → Executing → Idle
                              ↑                         ↓
                              └────── [用户修改] ────────┘
```

### 3.3 API 定义

**Endpoint**: `agent.focus`

**Request**:
```json
{
  "workflow_id": "meeting_setup_v1",
  "current_params": { "duration": 60 },
  "missing_fields": ["roomId", "startTime"],
  "user_input": "用三楼的大厅，明天下午三点"
}
```

**Response**:
```json
{
  "extracted_params": {
    "roomId": "floor3_hall",
    "startTime": "2026-01-10T15:00:00+08:00"
  },
  "confidence": { "roomId": 0.95, "startTime": 0.88 },
  "hint": "好的，三楼大厅已记录！"
}
```

### 3.4 自动执行条件

对于只读操作，可设置 `auto: true` 跳过确认：

| 条件 | 要求 |
|------|------|
| `auto` | `true` |
| 参数 | 完整 |
| 置信度 | ≥ `min_confidence` (默认 0.85) |
| 操作类型 | 只读（禁止写操作） |

### 3.5 循环保护

| 保护机制 | 阈值 | 行为 |
|----------|------|------|
| 最大澄清次数 | 3 | 切换为表单模式 |
| 最大重试次数 | 3 | 保存草稿退出 |
| 会话超时 | 5 分钟 | 自动保存 |

## 4. 任务分发

### 4.1 机制概述

微服务可通过在响应中返回 `_tasks` 字段，指示 Router 调用其他服务：

```
Client → Service A → Router → [分离 _tasks] → Client
                         ↓
                    Service B (异步)
```

### 4.2 响应结构

```json
{
  "result": {
    "data": { ...业务数据... },
    "_tasks": [
      {
        "service": "notification",
        "method": "create",
        "params": { "userId": "u123", "title": "欢迎" }
      }
    ]
  }
}
```

### 4.3 任务字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `service` | string | ✅ | 目标服务 |
| `method` | string | ✅ | 调用方法 |
| `params` | object | ✅ | 参数 |
| `mode` | string | ❌ | `async`(默认) 或 `sync` |

### 4.4 Router 处理逻辑

1. 接收 Service A 响应
2. 提取并移除 `_tasks`
3. 返回"干净"结果给客户端
4. 异步执行任务调用

## 5. 安全考虑

### 5.1 权限校验

执行 Workflow 前需校验用户对所有 steps 的权限：

```javascript
for (const step of workflow.steps) {
  if (!checkPermission(user.permit, step.service, step.method)) {
    throw { code: -32604, message: `No permission for ${step.method}` };
  }
}
```

### 5.2 任务分发安全

| 风险 | 缓解措施 |
|------|----------|
| 信任模型破坏 | Router 实施 ACL 白名单 |
| 无限循环 | 禁止任务生成子任务 |
| 参数篡改 | 目标服务严格校验 |

## 6. 错误处理

| 场景 | 处理方式 |
|------|----------|
| AI 无法提取参数 | 返回澄清问题 |
| 网络请求失败 | 重试 + 保存草稿 |
| 步骤执行失败 | 根据 `ignore_error` 决定是否继续 |
| 子任务失败 | 记录日志，不影响主响应 |

## 附录 A. 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0.0 | 2026-01-19 | 合并 orchestrator, focus, task 三个协议 |

## 附录 B. 相关协议

- [短期记忆协议](./memory) - Focus 的上下文来源
- [安全协议](./security) - 权限校验机制
