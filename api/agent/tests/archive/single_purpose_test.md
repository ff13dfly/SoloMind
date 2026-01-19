# CRM Single Purpose Test Results
Date: 2026-01-06

## Summary Comparison

| Case | Input Summary | Qwen (ZH) | Gemini (EN) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Pay money (Finance) | `["other"]` | `["other"]` | ✅ Both skipped (Correct) |
| **2** | Visit client (CRM) | `["crm.customer.listByCompany"]` | `Step 1: ["crm"]` <br> `Step 2: ["other"]` | ⚠️ Qwen found method; Gemini failed Step 2 |
| **3** | New employee (User/CRM) | `["crm.customer.create"]` | `["other"]` | ❓ Qwen matched (Loose); Gemini skipped |
| **4** | Organize meeting (Agenda) | `["other"]` | `["other"]` | ✅ Both skipped (Correct) |
| **5** | Book flight (Agenda) | `["other"]` | `["other"]` | ✅ Both skipped (Correct) |

## Detailed Logs

## Case 1
**Input**: `给远景效果图公司打款2000块，2025年的效果图费费用`

### Qwen (ZH)
**Step 1 Prompt**:
```

请分析用户输入是否属于【客户关系管理(CRM)】领域。
【CRM功能描述】: 客户关系管理功能, 关联的外部公司管理, 外部公司相关人员的信息管理

用户输入: "给远景效果图公司打款2000块，2025年的效果图费费用"

规则:
1. 如果相关，返回 ["crm"]
2. 如果不相关，返回 ["other"]
3. 仅返回JSON数组。

```
**Step 1 Result**: `["other"]`

### Gemini (EN)
**Step 1 Prompt**:
```

Analyze if the user input belongs to the [Customer Relationship Management (CRM)] domain.
[CRM Description]: customer relationship management, related company management, employee management of customer company

User Input: "给远景效果图公司打款2000块，2025年的效果图费费用"

Rules:
1. If relevant, return ["crm"]
2. If not, return ["other"]
3. Return ONLY a JSON array.

```
**Step 1 Result**: `["other"]`

---
## Case 2
**Input**: `今天去拜访了无锡恒大开发部，和陈总沟通了下，还见到了张工、李总，一起吃了个午饭，花了879`

### Qwen (ZH)
**Step 1 Prompt**:
```

请分析用户输入是否属于【客户关系管理(CRM)】领域。
【CRM功能描述】: 客户关系管理功能, 关联的外部公司管理, 外部公司相关人员的信息管理

用户输入: "今天去拜访了无锡恒大开发部，和陈总沟通了下，还见到了张工、李总，一起吃了个午饭，花了879"

规则:
1. 如果相关，返回 ["crm"]
2. 如果不相关，返回 ["other"]
3. 仅返回JSON数组。

```
**Step 1 Result**: `["crm"]`

**Step 2 Prompt**:
```

请从以下功能中选择最匹配的一项:
- crm.company.create: 创建客户公司
- crm.company.get: 获取客户公司详情
- crm.company.update: 更新客户公司详情（如地址、规模）
- crm.company.list: 列出客户公司; 检查数量
- crm.customer.create: 添加新客户（即使不知道公司）; 任何人都可以带来业务
- crm.customer.get: 搜索特定客户
- crm.customer.update: 更新客户所有细节
- crm.customer.list: 获取客户列表，通常用于查看下一个联系对象
- crm.customer.listByCompany: 查看特定公司的客户; 通常用于寻找突破口

用户输入: "今天去拜访了无锡恒大开发部，和陈总沟通了下，还见到了张工、李总，一起吃了个午饭，花了879"

规则:
1. 返回匹配的键名数组，例如 ["crm.company.create"]
2. 如果无法匹配，返回 ["other"]
3. 仅返回JSON数组。

```
**Step 2 Result**: `["crm.customer.listByCompany"]`

### Gemini (EN)
**Step 1 Prompt**:
```

Analyze if the user input belongs to the [Customer Relationship Management (CRM)] domain.
[CRM Description]: customer relationship management, related company management, employee management of customer company

User Input: "今天去拜访了无锡恒大开发部，和陈总沟通了下，还见到了张工、李总，一起吃了个午饭，花了879"

Rules:
1. If relevant, return ["crm"]
2. If not, return ["other"]
3. Return ONLY a JSON array.

```
**Step 1 Result**: `["crm"]`

**Step 2 Prompt**:
```

Select the most matching capability from the list:
- crm.company.create: create new customer company
- crm.company.get: get customer company details
- crm.company.update: update customer company details; such as address of the company, scale of the company
- crm.company.list: list the customer company; check the number
- crm.customer.create: add new customer, even don't know his/her company; anyone can bring bussiness
- crm.customer.get: search special customer
- crm.customer.update: update customer in every details
- crm.customer.list: get the customer list, normal to check who will be the next one to get touch
- crm.customer.listByCompany: check customer of special company; to find the breakpoint normally

User Input: "今天去拜访了无锡恒大开发部，和陈总沟通了下，还见到了张工、李总，一起吃了个午饭，花了879"

Rules:
1. Return an array of matching keys, e.g. ["crm.company.create"]
2. If no match, return ["other"]
3. Return ONLY a JSON array.

```
**Step 2 Result**: `["other"]`

---
## Case 3
**Input**: `公司新来了个员工，叫陈东`

### Qwen (ZH)
**Step 1 Prompt**:
```

请分析用户输入是否属于【客户关系管理(CRM)】领域。
【CRM功能描述】: 客户关系管理功能, 关联的外部公司管理, 外部公司相关人员的信息管理

用户输入: "公司新来了个员工，叫陈东"

规则:
1. 如果相关，返回 ["crm"]
2. 如果不相关，返回 ["other"]
3. 仅返回JSON数组。

```
**Step 1 Result**: `["crm"]`

**Step 2 Prompt**:
```

请从以下功能中选择最匹配的一项:
- crm.company.create: 创建客户公司
... (omitted for brevity)
- crm.customer.create: 添加新客户（即使不知道公司）; 任何人都可以带来业务
...

用户输入: "公司新来了个员工，叫陈东"
...
```
**Step 2 Result**: `["crm.customer.create"]`

### Gemini (EN)
**Step 1 Prompt**:
...
User Input: "公司新来了个员工，叫陈东"
...
**Step 1 Result**: `["other"]`

---
## Case 4
**Input**: `找张工、设计部的陈冰，还有做预算的李小晓，下午2点开个会，讨论下无锡恒大在东北塘新地块的事情`

### Qwen (ZH)
**Step 1 Result**: `["other"]`

### Gemini (EN)
**Step 1 Result**: `["other"]`

---
## Case 5
**Input**: `给董总预定个下周三去北京的机票，通知下财务`

### Qwen (ZH)
**Step 1 Result**: `["other"]`

### Gemini (EN)
**Step 1 Result**: `["other"]`

---
