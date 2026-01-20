# 快速开始 (Getting Started)

SoloMind 是为 AI 结对编程 (Pair Programming) 而生的系统。与其阅读冗长的安装文档，我们更推荐你**直接询问 AI**。

## 🤖 AI 原生模式 (推荐)

在下载代码后，请直接在你的 AI 编辑器（Cursor / Windsurf）中输入以下提示词，让 AI 引导你完成环境配置。

### 1. 环境安装与配置

> 💡 **Prompt:**
>
> "我是 SoloMind 的新用户。请检查我的本地环境（需要 Node.js 18+ 和 Redis 7+），并引导我完成依赖安装 (`npm install`) 和环境变量配置 (`.env`)。请解释 `.env` 中主要配置项的含义。"

### 2. 启动服务

> 💡 **Prompt:**
>
> "如何启动 SoloMind 的开发服务器？请告诉我启动命令，并解释启动后我可以通过哪些地址访问系统。"

### 3. 配置本地 SSL

> 💡 **Prompt:**
>
> "我需要在手机上调试本地运行的 SoloMind，请指导我如何配置本地 SSL 证书以启用 HTTPS 访问。"

---

## 🛠️ 传统手动模式 (Traditional Way)

如果你更喜欢亲自动手，或者 AI 暂时无法提供帮助，可以按照以下步骤手动操作。

### 1. 前置要求

- Node.js 18+
- Redis 7+
- 支持的 AI 服务 API Key（如 Google Gemini 或通义千问）

### 2. 安装

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

### 3. 配置 AI 服务

SoloMind 支持多种 AI 服务提供商，默认使用 **Google Gemini**。

#### Google Gemini（默认）

1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 点击 **Create API key** 创建密钥
3. 配置环境变量：

```bash
# .env 文件
GEMINI_API_KEY=your_key_here
AI_PROVIDER=gemini
```

#### 通义千问（可选）

```bash
# .env 文件
QWEN_API_KEY=your_key_here
AI_PROVIDER=qwen
```

#### 支持的能力

| 功能 | Gemini 模型 | Qwen 模型 |
|------|------------|----------|
| 图像解析 | `gemini-2.0-flash` | `qwen-vl-max` |
| 语音转文字 | `gemini-2.0-flash` | - |
| 文本解析 | `gemini-2.0-flash` | `qwen-max` |

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### 5. 本地 SSL 调试

当你将 `client/mobile` 部署到线上（如 GitHub Pages）后，若想连接本地运行的 Router 进行调试，需要为本地服务配置 SSL。

> [!NOTE]
> 此方法仅在**运行 Router 的同一台电脑**上有效。浏览器会将 `localhost` 解析为本机。

#### 方式一：使用启动脚本（推荐）

```bash
# 一键启动所有服务 + SSL 代理
./deploy/run.sh --ssl
```

脚本会自动：
- 安装 mkcert 和 local-ssl-proxy（如未安装）
- 生成本地 SSL 证书
- 启动 SSL 代理：`https://localhost:3800` → `http://localhost:3600`

#### 方式二：手动配置

```bash
# 安装 mkcert（生成本地信任的证书）
brew install mkcert
mkcert -install

# 安装 SSL 代理工具
npm install -g local-ssl-proxy

# 生成证书
mkdir -p ~/.certs && cd ~/.certs
mkcert localhost 127.0.0.1 ::1

# 启动 SSL 代理（Router 运行在 3600 端口）
local-ssl-proxy --source 3800 --target 3600 \
  --cert ~/.certs/localhost+2.pem \
  --key ~/.certs/localhost+2-key.pem
```

#### 浏览器首次使用

> [!IMPORTANT]
> **首次使用 HTTPS 时**，浏览器可能会显示"网络错误"，需要手动信任证书：
> 1. 在浏览器中直接访问 `https://localhost:3800/`
> 2. 点击"高级" → "继续前往 localhost（不安全）"
> 3. 返回登录页面重试

#### 配置客户端

在登录页面的 **SYSTEM GATEWAY CONFIGURATION** 下拉框中选择：
- `Local (SSL) - https://localhost:3800/` 使用 HTTPS
- `Local (HTTP) - http://localhost:3600/` 使用 HTTP（无需证书）

## 下一步

- 阅读 [系统架构](./architecture) 了解设计理念
- 查看 [开发参考](/zh/reference/) 深入了解内部实现
- 浏览 [API 文档](/zh/api/) 了解接口详情
