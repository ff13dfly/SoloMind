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

## Next Steps

- Read the Architecture documentation to understand the design philosophy
- Check [API Documentation](/en/api/) for interface details
