# Portals

该文件夹 (`portal/`) 存放系统中较为**复杂的前端功能模块**。这里的模块通常是完整的 Web 应用程序 (SPA)，拥有独立的状态管理、路由和复杂的交互逻辑。

它们共享同一套设计哲学：**后端定义，前端即现 (Backend-Defined, Frontend-Rendered)**。

---

## 1. Operator Portal (`portal/operator`)

**角色**：超级个体的“指挥中心” (Command Center)。

这是用户日常最高频使用的界面，负责业务流转与即时交互。它采用 **动态扩展架构 (Dynamic Extension Architecture)**，前端界面完全由后端微服务的元数据驱动。

### 核心特性 (Key Features)

*   **动态路由与导航 (Dynamic Routing)**
    *   不硬编码路由。通过 `ServicesProvider` 动态拉取后端服务列表，自动生成侧边栏、面包屑和路由表。
*   **双模式渲染 (Dual-Mode Rendering)**
    *   **专用 UI (Specialized Theme)**：如果注册了专用组件（如 `AssetManagement.tsx`），则加载富交互界面。
    *   **通用 UI (Generic Fallback)**：如果没有专用组件，系统根据后端 Entity Schema 自动生成通用的增删改查（CRUD）表格和表单。
*   **通用实体管理**
    *   自动生成多 Tab 页签。
    *   基于 Schema 自动生成表格列。
    *   提供 "Raw Data" 视图供调试。

### 技术路线 (Roadmap)

*   **状态管理**：引入 TanStack Query (React Query) 处理数据缓存与同步。
*   **表单引擎**：从原生 JSON 编辑全面转向 JSON Schema Form (@rjsf/core) 或 React Hook Form。
*   **性能优化**：对大数据集实体引入列表虚拟化 (react-window)。

---

## 2. System Portal (`portal/system`)

**角色**：系统的“仪表盘” (System Dashboard)。

这是用于底层基础设施管理的界面，主要关注系统的健康状况、微服务自省与 AI 调试。

### 核心特性 (Key Features)

*   **模型驱动概览 (Model-Driven Overview)**
    *   **服务发现**：实时列出所有活跃微服务。
    *   **实体自省 (Introspection)**：通过交互式气泡展示数据实体的字段定义。
    *   **能力网格**：可视化展示 RPC 方法与 AI 增强能力。
*   **AI 调试支持 (AI Support)**
    *   **用例生成**：调用 `agent.cases` 自动生成覆盖标准、口语化及边界情况的测试用例。
    *   **模拟器 (Mobile Simulator)**：在 Web 端模拟手机端的 Focus 模式交互，验证参数提取逻辑。
    *   **准确率报告**：计算意图识别与参数提取的成功率。

### 技术栈 (Tech Stack)

*   React + TypeScript + Vite
*   Vanilla CSS (Variables)
*   JSON-RPC 2.0 Client

---

> **开发提示**：
>
> 这两个 Portal 均采用独立的 Frontend 技术栈，可以独立开发与构建。它们对应的 `README.md` 文件已被移除，相关架构文档归档于此。
