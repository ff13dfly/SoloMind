# 工作流自动生成

> 系统本质是一个 **"AI 驱动的低代码引擎"**——AI 不仅在聊天，更在"写程序"。

## 核心可行性

| 基础能力 | 说明 |
|----------|------|
| **结构化协议** | 工作流采用标准 JSON 结构，适合 LLM 生成 |
| **自省能力** | `system.capabilities` 接口让 AI 知道所有可用 API |
| **沙箱执行** | 执行失败时返回 Trace，AI 可读取并修正 |

## 演进路线图

### 阶段一：意图到模板 ✅ 已实现

```
用户指令 → Agent 匹配现有模板 → 填充参数 → 执行
```

- 适用于确定性业务流程
- 高成功率，低风险

### 阶段二：线性链合成 🚧 近期目标

```
"把这张照片转成黑白，然后发邮件给张总"
  ↓ AI 分析
自动组合: image.filter + email.send
  ↓ 生成
{ "steps": [...] }
```

- AI 直接根据能力表选择 2-3 个方法
- 自动生成线性 JSON Steps

### 阶段三：逻辑分支 📋 中期目标

```
"检查库存，少于 10 件就采购，否则发日报"
  ↓ AI 生成
{
  "steps": [
    { "method": "inventory.check" },
    { "condition": "$step1.count < 10",
      "then": { "method": "purchase.create" },
      "else": { "method": "report.send" }
    }
  ]
}
```

### 阶段四：自愈与演进 🔮 远期目标

```
1. AI 生成工作流
2. 执行失败，读取 Error Trace
3. AI 分析原因，修改 JSON
4. 重新执行直到成功
5. 成功的工作流存入 Redis，成为新技能
```

## 技术关键点

### Prompt 工程

训练 AI 理解工作流 DSL：
- 变量引用语法：`${step1.result.id}`
- 步骤定义结构
- 错误处理模式

### 原子化微服务

微服务粒度越细，AI 合成成功率越高：

```
❌ 粗粒度: order.processAll()
✅ 细粒度: order.validate() + order.create() + payment.charge()
```

### 安全边界

涉及高风险操作时：
- 强制进入 Focus Mode
- 用户必须确认后才执行
- 支付、删除等操作不可自动化

## 示例：AI 生成的工作流

用户："每天早上 9 点给我发一份销售简报"

AI 生成：
```json
{
  "id": "wf_daily_sales",
  "name": "每日销售简报",
  "trigger": { "cron": "0 9 * * *" },
  "steps": [
    {
      "id": "fetch_sales",
      "method": "crm.sales.summary",
      "params": { "period": "yesterday" }
    },
    {
      "id": "format_report",
      "method": "agent.format",
      "params": { "data": "${fetch_sales.result}" }
    },
    {
      "id": "send_notification",
      "method": "notification.push",
      "params": { "content": "${format_report.result}" }
    }
  ]
}
```

## 价值

| 传统方式 | AI 自动生成 |
|----------|-------------|
| 程序员编写代码 | AI 生成 JSON |
| 需求变更需改代码 | 自然语言描述即可 |
| 能力固定 | 系统不断"进化" |
| 出厂即巅峰 | 越用越懂业务 |
