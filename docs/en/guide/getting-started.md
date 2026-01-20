# Getting Started

SoloMind is designed for AI Pair Programming. Instead of reading through lengthy installation docs, we highly recommend **asking your AI directly**.

## 🤖 AI Native Mode (Recommended)

After cloning the code, open your AI editor (Cursor / Windsurf) and use the following prompts to let the AI guide you through the setup.

### 1. Installation & Configuration

> 💡 **Prompt:**
>
> "I am a new user of SoloMind. Please check my local environment (requires Node.js 18+ and Redis 7+), and guide me through installing dependencies (`npm install`) and configuring environment variables (`.env`). Please explain the meaning of the main configuration items in `.env`."

### 2. Start Services

> 💡 **Prompt:**
>
> "How do I start the SoloMind development server? Please provide the start command and explain which addresses I can use to access the system after startup."

### 3. Local SSL Configuration

> 💡 **Prompt:**
>
> "I need to debug the locally running SoloMind on my mobile phone. Please guide me on how to configure a local SSL certificate to enable HTTPS access."

---

## 🛠️ Traditional Manual Mode

If you prefer to do it yourself, or if your AI cannot help for some reason, follow these steps.

### 1. Prerequisites

- Node.js 18+
- Redis 7+
- Supported AI Service API Key (e.g., Google Gemini or Qwen)

### 2. Installation

```bash
# Clone the project
git clone https://github.com/ff13dfly/SoloMind.git
cd SoloMind

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env file with your configuration
```

### 3. Configure AI Service

SoloMind supports multiple AI service providers, defaulting to **Google Gemini**.

#### Google Gemini (Default)

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API key**
3. Configure environment variables:

```bash
# .env file
GEMINI_API_KEY=your_key_here
AI_PROVIDER=gemini
```

#### Qwen (Optional)

```bash
# .env file
QWEN_API_KEY=your_key_here
AI_PROVIDER=qwen
```

#### Supported Capabilities

| Feature | Gemini Model | Qwen Model |
|---------|-------------|------------|
| Image Analysis | `gemini-2.0-flash` | `qwen-vl-max` |
| Speech to Text | `gemini-2.0-flash` | - |
| Text Analysis | `gemini-2.0-flash` | `qwen-max` |

### 4. Start Services

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### 5. Local SSL Debugging

When you deploy `client/mobile` online (e.g., GitHub Pages) and want to connect to a locally running Router for debugging, you need to configure SSL for the local service.

> [!NOTE]
> This method only works on **the same computer** running the Router. The browser resolves `localhost` as the local machine.

#### Option 1: Use Startup Script (Recommended)

```bash
# Start all services + SSL proxy with one command
./deploy/run.sh --ssl
```

The script will automatically:
- Install mkcert and local-ssl-proxy (if not installed)
- Generate local SSL certificates
- Start SSL proxy: `https://localhost:3800` → `http://localhost:3600`

#### Option 2: Manual Configuration

```bash
# Install mkcert (generates locally trusted certificates)
brew install mkcert
mkcert -install

# Install SSL proxy tool
npm install -g local-ssl-proxy

# Generate certificate
mkdir -p ~/.certs && cd ~/.certs
mkcert localhost 127.0.0.1 ::1

# Start SSL proxy (Router runs on port 3600)
local-ssl-proxy --source 3800 --target 3600 \
  --cert ~/.certs/localhost+2.pem \
  --key ~/.certs/localhost+2-key.pem
```

#### Browser First-Time Setup

> [!IMPORTANT]
> **On first HTTPS use**, the browser may show "Network Error". You need to manually trust the certificate:
> 1. Visit `https://localhost:3800/` directly in your browser
> 2. Click "Advanced" → "Proceed to localhost (unsafe)"
> 3. Return to the login page and retry

#### Configure Client

In the login page's **SYSTEM GATEWAY CONFIGURATION** dropdown, select:
- `Local (SSL) - https://localhost:3800/` for HTTPS
- `Local (HTTP) - http://localhost:3600/` for HTTP (no certificate needed)

## Next Steps

- Read the [Architecture](./architecture) documentation to understand the design philosophy
- Check [Development Reference](/en/reference/) for internal details
- Browse [API Documentation](/en/api/) for interface details
