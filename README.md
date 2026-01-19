# SoloMind

> **The Operating System for Super Individuals.**
>
> **超级个体的 AI 进化引擎。**

[![Documentation](https://img.shields.io/badge/docs-SoloMind-brightgreen)](https://ff13dfly.github.io/SoloMind/)

---

## 🚀 为什么选择 SoloMind？

SoloMind 解决了作为“超级个体”的核心矛盾：**你的想法无限，但你的手速有限。**

它打破了传统软件“交付即固化”的宿命，是一个**能够随你的成长而自我生长的系统 (Self-Evolving System)**。它融合了 AI 的生成能力与微服务的确定性，让你能够以**上帝视角**构建自己的数字外骨骼。

## ✨ 核心特性

### 1. 架构即提示词 (Architecture as a Prompt)

**这是第一款“写给 AI 看”的代码库。**

*   **AI 原生开发**：SoloMind 的代码结构本身就是最高效的 Prompt。标准化的微服务契约 (`introspection`) 是 API 的说明书，更是 AI 的生成模板。
*   **极速演进**：你只需对 AI 说：“我想加个理财功能”，它就能基于 `api/sample` 范式，在几十分钟内为你“生长”出一个符合标准、即插即用的新业务模块。

### 2. 零前端成本 (Protocol-Driven UI)

**后端定义，前端即现。**

*   **变色龙界面**：无论是移动端 AI 助手，还是 `Operator Portal` 管理后台，UI 均由后端数据结构动态驱动。
*   **AI 生产力闭环**：AI 只需要写好后端逻辑，前端界面自动就绪。这彻底消除了“AI 写后端快，人写前端慢”的瓶颈，让全栈开发速度提升 10 倍以上。

### 3. 确定性执行 (Deterministic Execution)

**拒绝 Chatbot 的“随机幻觉”。**

SoloMind 建立了一套严密的防幻觉体系：
*   **Phase 1 意图识别**：AI 从注册服务列表中只能“选择”，不能“瞎编”。
*   **Phase 2 严苛执行**：通过 JSON-RPC 强类型协议和工作流引擎保障业务逻辑的 100% 确定性。

---

### ⚡️ 为什么你需要 SoloMind 来做 "Vibe Coding"？

现在大家都在用 AI 写代码 (Vibe Coding)，但没有架构支撑的 AI 编程很容易陷入“改了一个 Bug 冒出三个新 Bug”的泥潭。

| 维度 | 普通 AI 编程 (Standard AI Coding) | **SoloMind 进化模式** |
| :--- | :--- | :--- |
| **上下文** | 需要把成百上千个文件塞给 AI，容易超出窗口限制 | **仅需 `api/sample` + `introspection.js` 两个文件** |
| **UI 开发** | AI 写的前端经常样式崩坏，交互逻辑需要反复调试 | **UI Free —— 后端定义数据，界面自动渲染** |
| **稳定性** | AI 生成的代码容易破坏现有逻辑 (Regression) | **微服务物理隔离，AI 此时此刻只通过增量文件扩展能力** |
| **心智负担** | 需要时刻检查 AI 有没有写错逻辑 | **Phase 2 强校验保障，AI 只能做填空题** |
| **测试维护** | 如果 AI 改了代码，测试也得重写，维护成本极高 | **YAML 数据驱动 —— 测试用例与代码解耦，AI 生成数据极其稳定** |
| **开发时间** | **3-4 小时** (含调试与修补) | **10-30 分钟** (结构化生成，几无错误空间) |

## 👤 目标用户

- 🎯 **自由职业者**：管理多个项目和客户的独立工作者
- 🎯 **知识创作者**：内容创作者、咨询顾问、教练培训师
- 🎯 **技术创业者**：独立开发者、个人品牌运营者
- 🎯 **效率追求者**：希望通过 AI 增强个人能力边界的任何人

## 🏗️ 技术栈

| 组件 | 技术 |
|------|------|
| 运行时 | Node.js 18+ |
| 数据存储 | Redis 7+ (JSON + Search) |
| 通信协议 | JSON-RPC 2.0 |
| AI 服务 | Google Gemini / 通义千问 |
| 文档 | VitePress |

## 🏁 快速开始 (Getting Started)

SoloMind 是为 AI 结对编程设计的，因此我们推荐一种全新的“AI 原生”上手方式。

### 1. 获取代码

```bash
git clone https://github.com/ff13dfly/SoloMind.git
cd SoloMind
```

### 2. 向你的 AI 提问（核心步骤）

**不要直接阅读代码。**

直接打开你的 AI 编辑器（Cursor / Windsurf），向它提问：

> "我是 SoloMind 的新用户，请阅读 `README.md` 和 `api/sample` 目录，告诉我这个系统是如何工作的？"

你会发现，AI 能直接充当你的“技术导师”，为你讲解架构，并引导你完成环境配置。这是 SoloMind "Architecture as a Prompt" 设计哲学的第一次实战。

### 3. 启动

```bash
npm install
npm start
```

## 📖 文档

访问 [在线文档](https://ff13dfly.github.io/SoloMind/) 获取详细指南。

- [快速开始](https://ff13dfly.github.io/SoloMind/zh/guide/getting-started)
- [系统架构](https://ff13dfly.github.io/SoloMind/zh/guide/architecture)
- [微服务开发指南](https://ff13dfly.github.io/SoloMind/zh/reference/microservice-guide)
- [AI 提示词策略](https://ff13dfly.github.io/SoloMind/zh/reference/prompt-strategy)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

> 💡 **这个系统是由人类架构师与 AI 结对编程 (Pair Programming) 共同构建的。**
> Human provided the vision and architecture; AI wrote 95% of the code.

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 许可证开源。
