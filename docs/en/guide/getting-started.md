# Quick Start

This guide will help you quickly deploy and use SoloMind.

## Prerequisites

- Node.js 18+
- Redis 7+
- Supported AI Service API Key (e.g., Qwen)

## Installation

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

## Start Services

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## Local SSL Debugging

When you deploy `client/mobile` online (e.g., GitHub Pages) and want to connect to a locally running Router for debugging, you need to configure SSL for the local service.

> [!NOTE]
> This method only works on **the same computer** running the Router. The browser resolves `localhost` as the local machine.

### Install Tools

```bash
# Install mkcert (generates locally trusted certificates)
brew install mkcert
mkcert -install

# Install SSL proxy tool
npm install -g local-ssl-proxy
```

### Generate Certificate

```bash
mkdir -p ~/.certs && cd ~/.certs
mkcert localhost 127.0.0.1 ::1
```

### Start SSL Proxy

Assuming the Router runs on port 3000:

```bash
local-ssl-proxy --source 3443 --target 3000 \
  --cert ~/.certs/localhost+2.pem \
  --key ~/.certs/localhost+2-key.pem
```

You can now access the local Router at `https://localhost:3443`.

### Configure Client

Set the API address in `client/mobile` to `https://localhost:3443` to connect the deployed frontend to your local backend for debugging.

## Next Steps

- Read the Architecture documentation to understand the design philosophy
- Check [API Documentation](/en/api/) for interface details
