# API Administrator

> 管理员认证与系统管理服务，负责后台登录验证和系统级操作。

## 核心职责

| 职责 | 说明 |
|------|------|
| **管理员认证** | 处理 System Portal 的登录验证 |
| **会话管理** | 生成和验证登录 Token |
| **错误日志** | 记录和查询系统错误 |

## 目录结构

```
api/administrator/
├── index.js              # 服务入口
├── config.js             # 配置（端口、Redis key）
├── db.js                 # 默认用户（开发用 fallback）
├── package.json          # 依赖声明
├── rpc_registry.js       # RPC 方法注册表
├── handlers/
│   ├── admin.js          # 管理操作
│   └── introspection.js  # 能力自省
├── logic/
│   ├── auth.js           # 认证逻辑（核心）
│   └── error.js          # 错误处理
├── scripts/
│   └── verify_hash_test.js  # 密码哈希验证脚本
└── tests/
    ├── auth.test.js
    └── handlers.test.js
```

---

## 🔐 管理员登录信息初始化

### 存储位置

管理员用户信息存储在 **Redis** 中：

| Key | 类型 | 说明 |
|-----|------|------|
| `administrator:user:{username}` | String (JSON) | 用户数据 |
| `administrator:users` | Set | 用户名列表 |

### 用户数据结构

```json
{
  "username": "admin",
  "salt": "82f37fd14558c3741652aa2d4dcf88fd",
  "iterations": 200000,
  "login_hash": "28cd1ad9bc77b57f0d8fa92729e4c73eb21a65e04c8283c0373efe78891719ed",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

| 字段 | 说明 |
|------|------|
| `username` | 用户名 |
| `salt` | 16 字节随机盐（hex 编码） |
| `iterations` | PBKDF2 迭代次数（默认 200000） |
| `login_hash` | 密码哈希值 |
| `role` | 角色：`admin` 或 `operator` |

### 密码哈希算法

```javascript
// 与前端 Login.tsx 保持一致
const key = password + username;
const hash = PBKDF2(key, salt, iterations, 32, 'sha256');
```

**Node.js 实现**：
```javascript
const crypto = require('crypto');

const password = 'your_password';
const username = 'admin';
const salt = crypto.randomBytes(16).toString('hex');
const iterations = 200000;

const loginHash = crypto.pbkdf2Sync(
    password + username,
    Buffer.from(salt, 'hex'),
    iterations,
    32,
    'sha256'
).toString('hex');
```

---

## 🚀 部署脚本：初始化管理员

### 方式一：通过 Redis CLI 直接写入

```bash
# 生成哈希后，直接写入 Redis
redis-cli SET "administrator:user:admin" '{"username":"admin","salt":"YOUR_SALT","iterations":200000,"login_hash":"YOUR_HASH","role":"admin"}'
redis-cli SADD "administrator:users" "admin"
```

### 方式二：使用初始化脚本

创建 `scripts/init_admin.js`：

```javascript
const crypto = require('crypto');
const { createClient } = require('redis');

async function initAdmin(username, password) {
    const client = createClient();
    await client.connect();

    const salt = crypto.randomBytes(16).toString('hex');
    const iterations = 200000;
    
    const loginHash = crypto.pbkdf2Sync(
        password + username,
        Buffer.from(salt, 'hex'),
        iterations,
        32,
        'sha256'
    ).toString('hex');

    const userData = {
        username,
        salt,
        iterations,
        login_hash: loginHash,
        role: 'admin',
        createdAt: new Date().toISOString()
    };

    await client.set(`administrator:user:${username}`, JSON.stringify(userData));
    await client.sAdd('administrator:users', username);
    
    console.log(`Admin user "${username}" created successfully`);
    console.log('You can now login with the provided password');
    
    await client.disconnect();
}

// 使用方式: node init_admin.js <username> <password>
const [,, username, password] = process.argv;
if (!username || !password) {
    console.log('Usage: node init_admin.js <username> <password>');
    process.exit(1);
}
initAdmin(username, password);
```

### 方式三：通过 RPC 接口创建（需已有管理员账号）

```bash
curl -X POST http://localhost:3680/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "admin.user.create",
    "params": {
      "username": "operator1",
      "password": "secure_password",
      "role": "operator"
    },
    "id": 1
  }'
```

---

## 📋 Fallback 机制

如果 Redis 中没有用户数据，系统会 fallback 到 `db.js`：

```javascript
// db.js - 开发环境默认用户
module.exports = {
  users: [
    {
      username: 'admin',
      salt: '82f37fd14558c3741652aa2d4dcf88fd',
      iterations: 200000,
      login_hash: '28cd1ad9bc77b57f0d8fa92729e4c73eb21a65e04c8283c0373efe78891719ed'
    }
  ]
};
```

**默认账号**：`admin` / `admin123`

> ⚠️ **生产环境必须**：
> 1. 在 Redis 中创建新的管理员账号
> 2. 或修改 `db.js` 中的 salt 和 hash

---

## 登录流程

```
┌─────────────────────────────────────────────────────┐
│  前端 (System Portal)                               │
├─────────────────────────────────────────────────────┤
│  1. 用户输入 username + password                    │
│  2. 调用 login_request 获取 salt + challenge       │
│  3. 计算 loginHash = PBKDF2(password+username,     │
│                             salt, iterations)       │
│  4. 计算 response = SHA256(challenge + loginHash)  │
│  5. 调用 login_verify 验证                         │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  后端 (Administrator Service)                       │
├─────────────────────────────────────────────────────┤
│  login_request:                                     │
│    - 从 Redis 或 db.js 获取用户                     │
│    - 返回 salt, iterations, challenge              │
│                                                     │
│  login_verify:                                      │
│    - 获取用户的 login_hash                          │
│    - 计算 expected = SHA256(challenge + login_hash) │
│    - 比较 response === expected                    │
│    - 成功则生成 session token                      │
└─────────────────────────────────────────────────────┘
```

---

## RPC 方法

### 认证相关

| 方法 | 说明 |
|------|------|
| `login_request` | 获取登录挑战 |
| `login_verify` | 验证登录响应 |
| `admin.user.create` | 创建管理员用户 |
| `admin.user.list` | 列出管理员用户 |

### 系统管理

| 方法 | 说明 |
|------|------|
| `admin.error.list` | 获取错误日志 |
| `admin.error.clear` | 清除错误日志 |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3680 | 服务端口 |
| `ROUTER_URL` | http://localhost:3600 | Router 地址 |
| `DEBUG` | true | 调试模式 |

## 运行

```bash
cd api/administrator
npm install
node index.js
```
