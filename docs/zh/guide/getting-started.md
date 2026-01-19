# 快速开始

本指南将帮助你快速部署和使用 SoloMind。

## 前置要求

- Node.js 18+
- Redis 7+
- 支持的 AI 服务 API Key（如 Google Gemini 或通义千问）

## 安装

```bash
# 克隆项目
git clone https://github.com/ff13dfly/SoloMind.git
cd SoloMind

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的配置
```

## 配置 AI 服务

SoloMind 支持多种 AI 服务提供商，默认使用 **Google Gemini**。

### Google Gemini（默认）

1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 点击 **Create API key** 创建密钥
3. 配置环境变量：

```bash
# .env 文件
GEMINI_API_KEY=your_key_here
AI_PROVIDER=gemini
```

### 通义千问（可选）

```bash
# .env 文件
QWEN_API_KEY=your_key_here
AI_PROVIDER=qwen
```

### 支持的能力

| 功能 | Gemini 模型 | Qwen 模型 |
|------|------------|----------|
| 图像解析 | `gemini-2.0-flash` | `qwen-vl-max` |
| 语音转文字 | `gemini-2.0-flash` | - |
| 文本解析 | `gemini-2.0-flash` | `qwen-max` |

## 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 下一步

- 阅读 [系统架构](./architecture) 了解设计理念
- 查看 [开发参考](/zh/reference/) 深入了解内部实现
- 浏览 [API 文档](/zh/api/) 了解接口详情
