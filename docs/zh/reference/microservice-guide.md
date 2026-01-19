# 微服务开发指南

> **参照标准**: `api/sample`

本文档规范业务型微服务的目录结构与开发模式。所有新建的业务服务都应遵循此结构，以保持系统的一致性和可维护性。

## 目录结构

```
api/service-name/
├── config.js           # 服务配置 (端口、数据库连接、常量)
├── index.js            # 服务入口 (启动 Server、连接 Redis)
├── package.json        # 依赖声明
├── handlers/           # [接口层] 处理 JSON-RPC 请求
│   ├── introspection.js # 自省定义 (服务能力声明)
│   ├── entities.js      # 实体定义 (数据 Schema)
│   └── ...             # 具体业务 Handler
├── logic/              # [逻辑层] 纯净的业务逻辑
│   ├── index.js        # 统一导出
│   └── ...             # 具体业务逻辑
└── tests/              # [测试层] 单元与集成测试
```

## 数据规划

### 多实体架构

每种类型的数据应定义为独立实体，避免单一大型 JSON 对象。

```
示例: api/asset
├── warehouse  (仓库)
├── section    (区域)
├── unit       (货架)
└── stuff      (物品)
```

### 设计原则

| 原则 | 说明 |
|------|------|
| **嵌套深度** | 最大 3 层，特例除外 |
| **单一职责** | 业务逻辑封闭在微服务内部 |
| **软删除** | 支持 `isArchived` 字段 |
| **外键命名** | 使用 `targetServiceName + Id` 格式 |

### 外键命名示例

```javascript
// ✅ 正确
{ userId: "u_123", companyId: "c_456" }

// ❌ 错误
{ uid: "u_123", cid: "c_456" }
```

## API 规划

### 命名规范

格式: `service_name.entity_name.method`

```
示例: new_service.contract.create
      new_service.contract.search
```

### 标准 API 清单

每个实体通常实现以下方法：

| 方法 | 说明 |
|------|------|
| `create` | 创建实体 |
| `update` | 更新实体 |
| `get` | 获取单体详情 |
| `delete` | 物理删除 (慎用) |
| `archive` | 软删除 |
| `recover` | 恢复 |
| `list` | 获取列表 |
| `search` | 高级搜索 |

### 必须实现的系统 API

| 方法 | 说明 | 依赖方 |
|------|------|--------|
| `methods` | 自省接口，返回所有 RPC 方法定义 | Agent |
| `entities` | 实体定义接口，返回数据 Schema | Agent |
| `ping` | 心跳检测 | Router |

## 分层架构

我们严格遵循 **Handler (Controller) - Logic (Service)** 分层模式。

### 接口层 (`handlers/`)

```javascript
// handlers/contract.js
async function create(params, context) {
  // 1. 参数校验
  if (!params.name) throw new Error('name required');
  
  // 2. 权限检查
  checkPermission(context.user, 'contract.create');
  
  // 3. 调用逻辑层
  return logic.contract.create(params);
}
```

**职责**：参数校验、权限检查、调用逻辑层、格式化响应

### 逻辑层 (`logic/`)

```javascript
// logic/contract.js
async function create(params, redisClient) {
  const id = generateId();
  const contract = { id, ...params, createdAt: Date.now() };
  await redisClient.json.set(`CONTRACT:${id}`, '$', contract);
  return contract;
}
```

**职责**：核心业务规则、数据库操作、跨服务交互

## 服务注册

微服务开发完成后，需注册到 Router 才能被识别。

### 注册流程

1. **启动服务**：监听端口 (如 `http://localhost:3700`)
2. **调用注册接口**：
   ```bash
   curl -X POST http://localhost:3600/api/rpc \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "system.add_service",
       "params": { "url": "http://localhost:3700" },
       "id": 1
     }'
   ```
3. **握手验证**：Router 自动执行 Z-Handshake 验证
4. **自省拉取**：验证通过后，Router 拉取并缓存 API 能力

## 联邦分类集成

系统采用 **联邦分类协议** 管理跨服务元数据分类。

### 核心原则

- **混合注册**：支持运行时创建和启动时预置
- **全局唯一**：分类 Key 全局唯一，由 Router 协调
- **本地存储**：配置项存储在归属服务的 Redis 中

### 启动时预置

```javascript
// config.js
module.exports = {
  seeds: {
    categories: [
      { key: 'CONTRACT_STATUS', items: ['draft', 'active', 'expired'] }
    ]
  }
};
```

服务启动时自动检查并写入 Redis。

## 开发流程

1. **定义能力**：在 `handlers/introspection.js` 中声明 API
2. **实现逻辑**：在 `logic/` 中编写业务代码
3. **接入入口**：在 `handlers/` 中编写 Handler
4. **注册服务**：执行 `system.add_service` 注册

## 示例代码

请参考 `api/sample` 目录：

- 入口模板: `api/sample/index.js`
- 接口定义: `api/sample/handlers/introspection.js`
- 实体定义: `api/sample/handlers/entities.js`
- 逻辑实现: `api/sample/logic/sample.js`
