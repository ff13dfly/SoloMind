---
description: 创建新微服务 - 基于 api/sample 模板和系统协议
---

# 创建微服务工作流 (Create Microservice Workflow)

本项目采用基于 JSON-RPC 2.0 的插件式微服务架构。创建新服务时必须遵循以下规范。

## 1. 基础准备

1. **确定服务名称**: 使用小写字母，例如 `order` 或 `inventory`。
2. **复制模板**: 
   ```bash
   cp -r api/sample api/<new-service-name>
   ```
3. **清理模板数据**:
   - 删除 `api/<new-service-name>/node_modules` (如果存在)。
   - 初始化 `package.json` 中的 `name` 和 `description`。

## 2. 核心文件配置

### 2.1 `config.js` (必须修改)
- **端口**: 为新服务分配一个唯一的端口（参考 `deploy/services.json` 查看已占用端口）。
- **语义描述 (description)**: 
  - 必须编写 `en` 和 `zh` 两个版本的描述。
  - `main` 字段描述服务整体职责。
  - `methods` 字典详细描述每个 RPC 方法的用途（用于意图识别）。
- **种子数据 (seeds)**: 如果服务涉及分类，在 `seeds.categories` 中定义。

### 2.2 `index.js` (必须修改)
- 修改 `SERVICE_NAME` 常量。
- 更新 `jsonrpc` 路由逻辑，映射新的业务方法。
- 确保保留 `ping`, `methods`, `entities` 等标准元方法。

### 2.3 `handlers/bootstrap.js`
- 确保 `initializeRedis` 和 `persistSemanticDescription` 逻辑正确。
- 服务启动时会自动将 `config.js` 中的语义描述写入 Redis (`SYSTEM:SEMANTIC:<NAME>`)。

## 3. 业务实现

1. **逻辑层 (`logic/`)**: 在 `logic/` 目录下实现具体的业务函数。
2. **处理器 (`handlers/`)**: 在 `handlers/` 中编写请求验证和响应包装逻辑。
3. **数据模型**: 遵循系统的数据流规范，尽量利用 Redis 进行状态管理。

## 4. 注册与部署

1. **更新 `deploy/services.json`**:
   将新服务添加到 `services.json` 列表中，以便 `deploy/run.sh` 能够管理。
   ```json
   { "name": "<service-name>", "path": "<service-name>/index.js", "port": <port> }
   ```
2. **注册到 Router**:
   服务启动后，通过调用 Router 的 `system.add_service` 方法进行注册：
   ```json
   {
     "jsonrpc": "2.0",
     "method": "system.add_service",
     "params": { "url": "http://localhost:<port>" },
     "id": 1
   }
   ```

## 5. 验证清单

- [ ] 服务能否独立启动并连接 Redis？
- [ ] `GET /auth/seed` 是否正常？
- [ ] `POST /jsonrpc` 调用 `ping` 是否返回正确的系统信息？
- [ ] 语义描述是否正确同步到 Redis？
- [ ] Router 是否能成功识别并转发请求到该服务？

> [!IMPORTANT]
> 遵循 [AI 工作流协议](file:///Users/fuzhongqiang/Desktop/www/SoloMind/docs/zh/protocol/workflow.md) 中的变量解析和任务分发规范。
