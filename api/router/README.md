# API Router

> 系统核心网关服务，负责 API 路由、权限审计、服务发现和请求转发。

## 核心职责

| 职责 | 说明 |
|------|------|
| **服务注册** | 微服务启动时向 Router 注册，Router 维护服务列表 |
| **能力发现** | 聚合所有微服务的 `introspection`，提供统一的能力表 |
| **请求路由** | 根据 RPC 方法名自动转发到对应微服务 |
| **权限控制** | 基于用户角色和权限检查访问权限 |
| **参数校验** | 根据方法 Schema 校验请求参数 |
| **任务调度** | 处理微服务返回的异步任务 |

## 目录结构

```
api/router/
├── index.js              # 服务入口
├── config.js             # 配置（端口、Redis、调试模式）
├── package.json          # 依赖声明
├── .keypair              # 服务身份密钥对（自动生成，勿提交）
├── .password             # 密钥加密密码（自动生成，勿提交）
├── handlers/             # RPC 方法处理器
│   ├── auth.js           # 认证握手、会话管理
│   ├── bootstrap.js      # Redis 初始化、服务发现
│   ├── capability.js     # 能力表构建与缓存
│   ├── category.js       # 联邦分类管理
│   ├── debugger.js       # 调试日志中间件
│   ├── forward.js        # 请求转发到微服务
│   ├── keypair.js        # 密钥对生成与加载
│   ├── permit.js         # 权限检查
│   ├── service.js        # 服务注册与状态检查
│   ├── system.js         # 系统日志查询
│   ├── tasks.js          # 异步任务处理
│   └── validator.js      # 参数校验
├── logic/                # 业务逻辑
│   ├── capability_builder.js  # 能力表构建器
│   └── user_loader.js         # 用户信息加载
├── scripts/              # 迁移脚本
└── tests/                # 单元测试
```

## 启动流程

```
1. 加载配置 (config.js)
2. 加载/生成密钥对 (.keypair)
3. 连接 Redis
4. 从 Redis 恢复已注册的服务列表
5. 拉取每个服务的能力定义 (introspection)
6. 启动 HTTP 服务，监听 RPC 请求
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/auth/key` | GET | 获取 Router 公钥 |
| `/api/rpc` | POST | JSON-RPC 2.0 入口 |

## 主要 RPC 方法

### 服务管理

| 方法 | 说明 |
|------|------|
| `system.add_service` | 注册新微服务 |
| `system.remove_service` | 移除微服务 |
| `system.list_services` | 列出所有已注册服务 |
| `system.check_service_status` | 检查服务状态并刷新能力表 |
| `system.capabilities` | 获取聚合后的能力表 |

### 联邦分类

| 方法 | 说明 |
|------|------|
| `system.category.reserve` | 服务启动时注册分类 |
| `system.category.delete` | 删除分类 |
| `system.category.list` | 列出所有分类 |
| `system.category.locate` | 定位分类来源服务 |

### 系统日志

| 方法 | 说明 |
|------|------|
| `system.get_logs` | 获取系统日志 |
| `system.get_interaction_logs` | 获取用户交互日志 |

---

## 🔐 密钥管理机制

Router 使用 **Solana Ed25519 密钥对** 作为服务身份标识。

### 相关文件

| 文件 | 作用 | Git 状态 |
|------|------|:--------:|
| `.keypair` | 服务私钥（64 字节 Ed25519） | **忽略** |
| `.password` | 加密密码（仅 debug 模式） | **忽略** |

### 自动生成逻辑

```
启动时检查 .keypair 是否存在
    │
    ├── 存在 ──────────────────────────┐
    │                                  │
    │   检查是否有 .password           │
    │       │                          │
    │       ├── 有 → AES-256 解密加载  │
    │       └── 无 → 明文 JSON 加载    │
    │                                  │
    └── 不存在 ────────────────────────┤
                                       │
        生成新的 Keypair               │
            │                          │
            ├── debug=true             │
            │   ├── 生成随机密码       │
            │   ├── 写入 .password     │
            │   └── 加密后写入 .keypair │
            │                          │
            └── debug=false            │
                └── 明文写入 .keypair   │
```

### 部署注意事项

| 场景 | 处理方式 |
|------|----------|
| **全新部署** | 无需准备，启动时自动生成新密钥 |
| **克隆部署** | 拷贝 `.keypair` 和 `.password`（如有） |
| **更换身份** | 删除 `.keypair` 和 `.password`，重启生成新密钥 |

### 公钥用途

- 作为服务唯一标识
- 签名微服务间通信
- 验证请求来源

获取当前公钥：
```bash
curl http://localhost:4800/auth/key
# {"publicKey":"Abc123..."}
```

---

## 请求处理流程

```
客户端请求 POST /api/rpc
    │
    ├─ 1. 解析 JSON-RPC (method, params, id)
    │
    ├─ 2. 检查是否为系统方法 (system.*)
    │      ├── 是 → 直接处理
    │      └── 否 → 继续
    │
    ├─ 3. 认证：提取 Token，解析用户身份
    │
    ├─ 4. 路由：根据 method 前缀定位目标服务
    │
    ├─ 5. 权限检查（Permit）
    │      ├── 拒绝 → 返回 403
    │      └── 通过 → 继续
    │
    ├─ 6. 参数校验（Validator）
    │      ├── 失败 → 返回错误
    │      └── 通过 → 继续
    │
    ├─ 7. 转发请求到目标微服务
    │
    ├─ 8. 处理响应中的异步任务（Tasks）
    │
    └─ 9. 返回结果，记录交互日志
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 4800 | Router 监听端口 |
| `REDIS_URL` | redis://localhost:6379 | Redis 连接地址 |
| `DEBUG` | false | 是否启用调试模式 |

## 运行

```bash
cd api/router
npm install
node index.js
```

## 测试

```bash
npm test
```
