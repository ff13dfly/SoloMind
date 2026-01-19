# 安全与权限协议 (Security Protocol)

---

> **协议版本**: 1.0.0  
> **状态**: 稳定 (Stable)  
> **作者**: Fuu  
> **许可证**: Apache 2.0

---

## 摘要

本协议定义了 SoloMind 系统的安全体系，包括零知识认证机制和细粒度权限控制。

## 1. 简介

### 1.1 设计原则

| 原则 | 说明 |
|------|------|
| **零知识** | 服务器永不接收明文密码 |
| **最小权限** | 新用户默认无权限，按需分配 |
| **细粒度** | 支持服务级和方法级权限控制 |
| **会话隔离** | 不同设备独立会话 |

### 1.2 安全体系架构

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   客户端     │───▶│   Router    │───▶│   微服务    │
│ (密钥派生)   │    │ (认证+权限)  │    │ (业务逻辑)  │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 2. 认证机制 (Z-Handshake)

### 2.1 概述

**Z-Handshake** (Zero-Knowledge Handshake) 采用挑战-响应模式，确保：
- 服务器永不存储明文密码
- 仅通过密码验证子 (Verifier) 进行零知识证明

### 2.2 算法流程

#### 阶段一：密钥派生

- **算法**: `PBKDF2-HMAC-SHA256`
- **迭代次数**: 200,000

```javascript
InputKey = password + username
LoginHash = PBKDF2(InputKey, salt, {
    keySize: 256 / 32,
    iterations: 200000,
    hasher: SHA256
}).toString(Hex)
```

#### 阶段二：挑战响应

- **算法**: `SHA256`

```javascript
Response = SHA256(challenge + LoginHash).toString(Hex)
```

### 2.3 通信流程

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: 握手请求                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Client → POST /login_request { username }                        │
│ Server ← { challenge, salt, iterations }                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: 计算签名 (客户端)                                        │
├─────────────────────────────────────────────────────────────────┤
│ LoginHash = PBKDF2(password + username, salt, iterations)        │
│ Response = SHA256(challenge + LoginHash)                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: 验证 (服务端)                                            │
├─────────────────────────────────────────────────────────────────┤
│ Client → POST /login_verify { username, challenge, response }    │
│ Server: Expected = SHA256(challenge + StoredLoginHash)           │
│         if (Expected === Response) → 颁发 Session Token          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 安全特性

| 特性 | 说明 |
|------|------|
| **数据库泄漏免疫** | 仅存储 LoginHash，无法逆向 |
| **抗重放攻击** | challenge 一次性使用，60 秒过期 |
| **零知识** | 服务器内存中从未出现明文密码 |

### 2.5 代码参考

**前端 (TypeScript)**:
```typescript
export const deriveLoginHash = (password: string, username: string, salt: string, iterations: number) => {
    const key = password + username;
    const saltWords = CryptoJS.enc.Hex.parse(salt);
    return CryptoJS.PBKDF2(key, saltWords, {
        keySize: 256 / 32,
        iterations,
        hasher: CryptoJS.algo.SHA256
    }).toString();
};
```

**后端 (Node.js)**:
```javascript
const expected = crypto.createHash('sha256')
    .update(challenge + user.login_hash)
    .digest('hex');

if (response === expected) {
    // 认证成功
}
```

## 3. 权限控制 (Permit)

### 3.1 数据结构

存储在 `user:<uid>.permit` 字段中：

```typescript
interface Permit {
  allow_all: boolean;  // true = 管理员
  services: {
    [serviceName: string]: string[];  // "*" 表示全权限
  };
}
```

### 3.2 权限示例

```javascript
// 管理员
{ allow_all: true, services: {} }

// 财务专员
{ allow_all: false, services: { "finance": ["*"] } }

// 销售人员
{ allow_all: false, services: {
    "crm": ["crm.customer.get", "crm.customer.list"],
    "finance": ["finance.create"]
  }
}
```

### 3.3 校验流程

```
请求 → Router → 解析 Session → 检查 Permit → 通过/拒绝
```

**校验函数**:
```javascript
function checkPermission(permit, service, method) {
    if (!permit) return false;
    if (permit.allow_all) return true;
    
    const allowed = permit.services[service];
    if (!allowed) return false;
    if (allowed.includes('*')) return true;
    if (allowed.includes(method)) return true;
    
    return false;
}
```

### 3.4 公开方法白名单

以下方法无需权限校验：

```javascript
const PUBLIC_METHODS = [
  'user.register',
  'user.login_request',
  'user.login_verify',
  'system.ping',
  'system.capabilities'
];
```

### 3.5 权限生命周期

| 阶段 | 行为 |
|------|------|
| **注册** | 新用户 `permit = { allow_all: false, services: {} }` |
| **登录** | `permit` 写入 Session |
| **请求** | Router 从 Session 读取并校验 |

### 3.6 Workflow 权限

执行 Workflow 需要所有 steps 的权限：

```javascript
for (const step of workflow.steps) {
  if (!checkPermission(user.permit, step.service, step.method)) {
    throw { code: -32604, message: `Forbidden: ${step.method}` };
  }
}
```

## 4. 错误码

| 错误码 | 名称 | 说明 |
|--------|------|------|
| `-32600` | Unauthorized | 未登录或 Token 无效 |
| `-32604` | Forbidden | 无权限访问该方法 |
| `-32605` | SessionExpired | 会话已过期 |

## 5. 安全建议

| 建议 | 说明 |
|------|------|
| ✅ 最小权限 | 按需分配，默认无权限 |
| ✅ 审计日志 | 记录权限变更 |
| ✅ 定期轮换 | Session Token 7 天过期 |
| ❌ 禁止明文 | 任何日志不得包含密码 |

## 附录 A. 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0.0 | 2026-01-19 | 合并 auth, permit 两个协议 |

## 附录 B. 相关协议

- [工作流协议](./workflow) - Workflow 权限校验
- [审批协议](./approval) - 审批人权限控制
