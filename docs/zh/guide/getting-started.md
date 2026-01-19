# 快速开始

本指南将帮助你快速部署和使用 SoloMind。

## 前置要求

- Node.js 18+
- Redis 7+
- 支持的 AI 服务 API Key（如通义千问）

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
- 查看 [API 文档](/zh/api/) 了解接口详情
