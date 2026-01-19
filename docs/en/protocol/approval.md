# 审批协议 (Approval Protocol)

---

> **协议版本**: 1.0.0  
> **状态**: 稳定 (Stable)  
> **作者**: Fuu  
> **许可证**: Apache 2.0

---

## 摘要

本协议定义了审批工作流的数据结构和处理流程，使用显式 APPROVAL 实体与 Notification 服务集成。

## 1. 简介

### 1.1 目的

本协议旨在提供一个标准化的审批机制，支持多种审批模式（全部通过、任一通过、顺序审批）并自动与通知系统集成。

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| **显式实体** | 使用独立的 APPROVAL 实体而非嵌入业务数据 |
| **永久审计** | 审批记录永久保留，支持历史追溯 |
| **查询优化** | 通过临时 NTF 实体加速待审批查询 |

## 2. 术语定义

| 术语 | 定义 |
|------|------|
| **APPROVAL** | 核心审批实体，永久存储 |
| **NTF** | 通知实体，临时存储用于查询加速 |
| **TTL** | Time To Live，生存时间 |

---

## 3. 概述

本协议使用 **两个显式实体**：

| 实体 | Key 前缀 | 用途 | 生命周期 |
|:---|:---|:---|:---|
| **APPROVAL** | `APPROVAL:*` | 核心审批数据 + 审计追踪 | **永久保留** |
| **NTF** | `NTF:*` | 每用户通知，用于查询加速 | **TTL (自动删除)** |

```
APPROVAL:001 (永久)              NTF:001, NTF:002 (临时)
┌──────────────────────┐         ┌──────────────────────┐
│ 核心审批数据         │         │ 每用户指针           │
│ + 完整审计追踪       │◄────────│ (查询加速)           │
│ + 历史记录           │         │ TTL: 7天             │
└──────────────────────┘         └──────────────────────┘
```

---

## 2. 数据结构

### 2.1 APPROVAL 实体 (永久)

```json
{
  "id": "APPROVAL:onboard_001",
  "related_entity": { "type": "EMPLOYEE", "id": "EMP:new_001" },
  "mode": "SEQUENTIAL",
  "status": "PENDING",
  "created_at": "2026-01-12T07:00:00Z",
  "completed_at": null,
  
  "required": [
    { "user_id": "USR:HR_001", "order": 1, "status": "APPROVED", "action_at": "2026-01-12T07:15:00Z" },
    { "user_id": "USR:MANAGER_001", "order": 2, "status": "PENDING", "action_at": null },
    { "user_id": "USR:CEO_001", "order": 3, "status": "WAITING", "action_at": null }
  ],
  
  "force": ["USR:BOSS"],
  "initiator": "USR:HR_001"
}
```

### 2.2 NTF 实体 (临时, TTL)

```json
{
  "id": "NTF:approval_manager_001",
  "type": "APPROVAL",
  "target_user": "USR:MANAGER_001",
  "approval_id": "APPROVAL:onboard_001",
  "status": "PENDING",
  "created_at": "2026-01-12T07:15:00Z"
}
```

### 2.3 字段定义

#### APPROVAL 字段

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `id` | `string` | 唯一标识符 |
| `related_entity` | `object` | 被审批的实体 |
| `mode` | `enum` | `ALL`, `ANY`, `SEQUENTIAL` |
| `status` | `enum` | `PENDING`, `COMPLETED`, `REJECTED`, `CANCELLED`, `EXPIRED` |
| `required[]` | `array` | 审批人列表，包含 `user_id`, `order`, `status`, `action_at` |
| `force[]` | `array` | 旁路审批人 |
| `initiator` | `string` | 审批发起人 |

#### NTF 字段

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `type` | `string` | `"APPROVAL"` |
| `target_user` | `string` | 通知接收人 |
| `approval_id` | `string` | 关联的 APPROVAL 实体 |
| `status` | `enum` | `PENDING`, `APPROVED`, `REJECTED` |

---

## 3. 审批模式

| 模式 | 行为 |
|:---|:---|
| `ALL` | `required[]` 中所有用户都必须审批。并行执行。 |
| `ANY` | 任一用户审批即完成流程。 |
| `SEQUENTIAL` | 按 `order` 顺序逐个通知审批人。 |

### `force[]` 旁路机制

> `force[]` 是与 `mode` **并行的"或"条件**，不是独立的模式。

```javascript
function checkApprovalComplete(approval) {
  // 1. Force 旁路 (最高优先级)
  if (approval.force.some(u => getStatus(u) === 'APPROVED')) {
    return true;
  }
  
  // 2. 正常模式逻辑
  switch (approval.mode) {
    case 'ALL': return approval.required.every(u => u.status === 'APPROVED');
    case 'ANY': return approval.required.some(u => u.status === 'APPROVED');
    case 'SEQUENTIAL': return approval.required.every(u => u.status === 'APPROVED');
  }
}
```

---

## 4. 生命周期 & 自动删除

### 4.1 状态转换

```
PENDING ──┬──► COMPLETED (全部通过 / force 通过)
          ├──► REJECTED  (任一拒绝)
          ├──► CANCELLED (发起人取消)
          └──► EXPIRED   (超时)
```

### 4.2 数据保留策略

| 实体 | 何时删除 | TTL 值 |
|:---|:---|:---:|
| **APPROVAL** | **永不删除** (永久历史) | ❌ 无 TTL |
| **NTF** (待处理) | 用户操作后 | 7 天 |
| **NTF** (已处理) | 操作后立即设置 TTL | 7 天 |

### 4.3 NTF 自动删除逻辑

```javascript
async function onApprovalAction(approvalId, userId, action) {
  // 1. 更新 APPROVAL 实体
  await updateApprovalStatus(approvalId, userId, action);
  
  // 2. 设置 NTF TTL (7天后自动删除)
  const ntfId = await findNtfByApprovalAndUser(approvalId, userId);
  await redis.call('EXPIRE', ntfId, 7 * 24 * 60 * 60);
  
  // 3. 如果是 SEQUENTIAL，创建下一个 NTF
  if (shouldCreateNextNtf(approvalId)) {
    await createNtfForNextApprover(approvalId);
  }
}
```

### 4.4 为什么 NTF 是临时的

| 没有 NTF | 有 NTF |
|:---|:---|
| 查询"我的待审批"需要扫描所有 APPROVAL 实体 | 直接按 `target_user` 索引查询 |
| O(N × M) 复杂度 | **O(log N)** 复杂度 |

**NTF 是查询加速层。核心数据在 APPROVAL 中。**

---

## 5. API 设计 (集成到 Notification 服务)

### 5.1 服务结构

```
api/notification/
├── rpc_registry.js
│   ├── notification.create       # 普通通知
│   ├── notification.list         # 通知列表
│   ├── notification.read         # 标记已读
│   │
│   ├── approval.create           # 创建审批 (仅 WORKFLOW)
│   ├── approval.action           # 审批/拒绝 (仅目标用户)
│   ├── approval.addApprover      # 动态添加
│   ├── approval.get              # 获取审批详情
│   └── approval.list             # 审批列表
```

### 5.2 权限控制

| API | 授权调用者 | 效果 |
|:---|:---|:---|
| `approval.create` | **仅 WORKFLOW** | 创建审批 |
| `approval.action` | **仅目标用户** | 审批/拒绝 |
| `approval.addApprover` | MANAGER, HR, 发起人 | 动态添加 |
| `approval.get` | 任意参与者 | 查看详情 |
| `approval.list` | ADMIN | 公司全局列表 |

---

## 6. 查询模式

### 6.1 我的待审批 (通过 NTF)

```javascript
await redis.call('FT.SEARCH', 'idx:notifications',
  '@target_user:{USR\\:xxx} @type:{APPROVAL} @status:{PENDING}',
  'SORTBY', 'created_at', 'DESC'
);
```

### 6.2 审批详情 (通过 APPROVAL)

```javascript
const approval = await redis.call('JSON.GET', 'APPROVAL:onboard_001');
// 返回完整审计追踪，包括谁在何时审批
```

### 6.3 公司全局审批列表

```javascript
await redis.call('FT.SEARCH', 'idx:approvals',
  '*',
  'SORTBY', 'created_at', 'DESC',
  'LIMIT', 0, 50
);

// 按状态筛选
await redis.call('FT.SEARCH', 'idx:approvals',
  '@status:{PENDING}',
  'SORTBY', 'created_at', 'DESC'
);
```

### 6.4 所需索引

```javascript
// APPROVAL 实体索引
await redis.call('FT.CREATE', 'idx:approvals',
  'ON', 'JSON', 'PREFIX', '1', 'APPROVAL:',
  'SCHEMA',
    '$.status', 'AS', 'status', 'TAG',
    '$.mode', 'AS', 'mode', 'TAG',
    '$.created_at', 'AS', 'created_at', 'NUMERIC', 'SORTABLE'
);

// NTF 实体索引 (已存在于 notification 索引中)
// 使用 idx:notifications，筛选 @type:{APPROVAL}
```

---

## 7. 静态审批人 vs 动态审批人

| 层级 | 定义位置 | 可变性 |
|:---|:---|:---|
| **静态** | Workflow JSON | 不可变 |
| **动态** | 运行时 API 调用 | 可变 |

### 静态 (Workflow 定义)

```json
{
  "method": "approval.create",
  "params": {
    "related_entity": "$step.1.result",
    "mode": "ALL",
    "required": [
      { "role": "HR" },
      { "role": "DIRECT_MANAGER" }
    ]
  }
}
```

### 动态 (运行时)

```javascript
await api("approval.addApprover", {
  approval_id: "APPROVAL:onboard_001",
  approver: { user_id: "USR:CEO_001" }
});
```

---

## 8. 边缘情况

### 8.1 拒绝理由 (P0)

```json
{
  "required": [
    { 
      "user_id": "USR:MANAGER", 
      "status": "REJECTED", 
      "action_at": "2026-01-12T08:00:00Z",
      "rejection_reason": "缺少文档"  // ← 理由字段
    }
  ]
}
```

### 8.2 关联实体状态同步 (P0)

```javascript
async function onApprovalComplete(approvalId, finalStatus) {
  const approval = await redis.call('JSON.GET', approvalId);
  const entity = approval.related_entity;
  
  // 更新实体审批状态
  await redis.call('JSON.SET', 
    `${entity.type}:${entity.id}`, 
    '$.approval_status', 
    JSON.stringify(finalStatus === 'COMPLETED' ? 'APPROVED' : 'REJECTED')
  );
}
```

### 8.3 顺序审批可见性 (P1)

在 SEQUENTIAL 模式下，只有轮到时才创建 NTF：

| 用户 | 顺序 | NTF 是否创建 |
|:---|:---:|:---:|
| HR | 1 | ✅ 是 (立即创建) |
| 经理 | 2 | ❌ 否 (直到 HR 通过) |
| CEO | 3 | ❌ 否 (直到经理通过) |

```javascript
// SEQUENTIAL 模式的 NTF 创建逻辑
if (approval.mode === 'SEQUENTIAL') {
  const nextApprover = approval.required.find(u => u.status === 'WAITING');
  if (nextApprover) {
    nextApprover.status = 'PENDING';
    await createNtfForUser(approval.id, nextApprover.user_id);
  }
}
```

### 8.4 撤销机制 (P1)

| 条件 | 可以撤销吗 |
|:---|:---:|
| 操作后 5 分钟内 | ✅ 可以 |
| 审批已完成 | ❌ 不可以 |
| 下一个审批人已操作 | ❌ 不可以 |

```javascript
approval.addApi('approval.revoke', {
  params: { approval_id, user_id },
  logic: async () => {
    const user = findUserInApproval(approval_id, user_id);
    if (Date.now() - user.action_at > 5 * 60 * 1000) {
      throw new Error('撤销窗口已过期');
    }
    user.status = 'PENDING';
    user.action_at = null;
  }
});
```

### 8.5 UI 按钮逻辑 (P2)

| 审批人数 | 按钮文字 | 行为 |
|:---:|:---|:---|
| 1 | "已读" | 普通通知 |
| 2+ | "审批" / "拒绝" | 审批操作 |

### 8.6 提醒与升级 (P2)

```javascript
// 定时任务: 每小时
async function checkPendingApprovals() {
  const pending = await findPendingApprovals();
  
  for (const approval of pending) {
    const hoursElapsed = (Date.now() - approval.created_at) / 3600000;
    
    if (hoursElapsed > 24 && !approval.reminded) {
      await sendReminder(approval);
      approval.reminded = true;
    }
    
    if (hoursElapsed > approval.ttl_hours) {
      approval.status = 'EXPIRED';
      await syncRelatedEntityStatus(approval, 'EXPIRED');
    }
  }
}
```

---

## 9. 路线图

| 优先级 | 功能 | 状态 |
|:---:|:---|:---:|
| **P0** | 拒绝理由字段 | ⏳ 设计完成 |
| **P0** | 关联实体状态同步 | ⏳ 设计完成 |
| **P1** | 顺序审批可见性 | ⏳ 设计完成 |
| **P1** | 5 分钟内撤销 | ⏳ 设计完成 |
| **P2** | UI 按钮逻辑 | 📝 已文档化 |
| **P2** | 提醒与升级 | ⏳ 设计完成 |

---

## 10. 总结

| 方面 | 设计决策 |
|:---|:---|
| **核心实体** | `APPROVAL:*` — 永久保留，包含完整审计追踪 |
| **加速层** | `NTF:*` — 临时，通过 TTL 自动删除 |
| **服务位置** | 集成到 `api/notification` |
| **历史查询** | 直接查询 `APPROVAL:*` (永不删除) |
| **待审批查询** | 通过 `NTF:*` 按 `target_user` 查询 (快速索引) |
