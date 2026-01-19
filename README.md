# SoloMind

> 超级个体的 AI 原生私域能力管理平台
>
> [![Documentation](https://img.shields.io/badge/docs-SoloMind-brightgreen)](https://ff13dfly.github.io/SoloMind/)

## 项目简介

**SoloMind** 是一个专为**超级个体**（Super Individual）设计的 AI 原生私域能力管理系统。

在当今数字化时代，超级个体——那些具备多元技能、独立运作并追求高效自我实现的个人——需要一套完全私有化、可控的工具来管理和增强自己的能力。SoloMind 正是为此而生。

## ✨ 核心特性

### 🧠 AI 原生架构

SoloMind 不是"在传统系统上加 AI"，而是**从底层为 AI 而设计**：

| 设计理念 | 实现方式 |
|----------|----------|
| **自然语言入口** | 用户通过对话完成所有操作，无需学习系统 |
| **能力自发现** | 微服务自动注册，AI 自动感知新能力 |
| **确定性执行** | AI 只做"选择"，执行由工作流引擎保障 |
| **渐进式增强** | 新能力上线后 AI 立即可用，无需重新训练 |

### 🚀 Architecture as a Prompt (架构即提示词)

SoloMind 的架构设计不仅是为了运行代码，更是为了**让 AI 能够理解并扩展系统**。这种“基于现有模式自动演进”的能力，使得开发者只需向 AI 提供本项目代码，即可在数小时内完成传统需要数天的开发工作：

*   **模式复刻 (Pattern Replay)**：AI 通过分析 `api/sample` 即可掌握微服务开发范式，无需人工编写脚手架。
*   **自描述通信**：微服务内置的 `introspection` 接口让 AI 能自动生成前后端对接逻辑。
*   **模型驱动的管理后台**：`portal/operator` 具备动态感知能力，能根据微服务的实体定义自动渲染出一套完整的 CRUD 管理界面，实现“后端上线，管理后台立即可用”。
*   **零联调成本**：后端能力一旦定义，移动端 UI 依据元数据自动适配，省去 80% 的前后端联调时间。

### 🔗 微服务保障 AI 确定性

传统 AI 应用面临"幻觉"和"不稳定"问题。SoloMind 通过微服务架构建立多层护栏：

```
用户自然语言
    ↓ Phase 1: 意图识别（从有限列表选择）
工作流 ID
    ↓ Phase 2: 参数提取（Schema 约束）
结构化参数
    ↓ 确定性执行
工作流引擎 → 微服务调用 → Redis
```

- **强类型能力声明**：每个微服务必须声明自己能做什么（introspection）
- **实体 Schema 约束**：参数类型、必填项由数据定义，非 AI 猜测
- **工作流执行契约**：步骤编排、参数传递是确定性的

### 🚀 渐进式能力扩展

```
新增微服务 → 自动注册 → AI 自动发现 → 用户立即可用
新增工作流 → JSON 配置 → 无需改代码 → 业务流程上线
优化同义词 → 更新配置 → AI 理解更准 → 用户体验提升
```

三层解耦，各层独立演进：
- **微服务层**：原子能力，可独立部署
- **工作流层**：业务编排，可热更新
- **AI 层**：智能入口，可替换升级

## 🎯 核心理念

- **完全私域**：所有数据和能力定义完全归个人所有
- **AI 原生**：从架构层面为 AI 交互优化，而非事后添加
- **自主可控**：个人完全掌控系统的配置、扩展和演进

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

## 📖 文档

访问 [在线文档](https://ff13dfly.github.io/SoloMind/) 获取详细指南。

- [快速开始](https://ff13dfly.github.io/SoloMind/zh/guide/getting-started)
- [系统架构](https://ff13dfly.github.io/SoloMind/zh/guide/architecture)
- [微服务开发指南](https://ff13dfly.github.io/SoloMind/zh/reference/microservice-guide)
- [AI 提示词策略](https://ff13dfly.github.io/SoloMind/zh/reference/prompt-strategy)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 许可证开源。
