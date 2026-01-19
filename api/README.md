# API (Microservices Backend)

该文件夹 (`api/`) 是 SoloMind 的后端核心，包含所有的微服务、基础设施代码和开发模板。

系统采用 **Node.js + Redis (JSON/Search) + JSON-RPC 2.0** 的架构，通过微服务解耦复杂的业务逻辑。

## 目录结构 (Directory Structure)

### 1. 核心服务 (`api/core/`)

这是系统运行时的核心微服务集合，这些服务在 `deploy/services.json` 中注册并随系统启动。

*   **router**: 系统的网关与服务发现中心。所有 RPC 请求经由此转发，同时负责鉴权 (Auth) 与服务自省 (Introspection) 的聚合。
*   **agent**: AI 核心服务，负责意图识别 (Intent) 与工作流编排 (Workflow)。
*   **orchestrator**: 任务运行时，负责执行具体的业务流程。
*   **administrator**: 系统管理服务，提供日志查看、配置管理等能力。
*   **user**: 用户身份与权限管理。
*   **gateway**: (Optional) 外部 HTTP 网关，用于处理非 RPC 的标准 Restful 请求（如文件上传、回调钩子）。

### 2. 开发模板 (`api/sample/`)

**角色**：新微服务的孵化器。

包含了一个标准微服务的完整脚手架，遵循 "Architecture as a Prompt" 设计规范。
> 💡 **开发指南**：详细的微服务开发教程、代码规范与数据结构定义，请阅读 [api/sample/README.md](./sample/README.md)。

### 3. 应用集 (`api/apps/`)

*(Reserved)* 用于存放未来扩展的业务层微服务或第三方集成插件。

---

## 快速开始 (后端开发)

### 启动所有服务

推荐在项目根目录使用 `deploy/run.sh` 脚本启动：

```bash
# 在项目根目录
./deploy/run.sh
```

或者进入各个微服务目录单独启动（主要用于调试）：

```bash
cd api/core/agent
npm install
npm start
```

### 调试

所有微服务均监听不同的端口（定义在 `config.js`），并统一通过 Router (Port 3600) 暴露 JSON-RPC 接口。

*   **Router**: Port 3600
*   **Agent**: Port 3730
*   **Orchestrator**: Port 3820
*   ... (详见 `deploy/services.json`)
