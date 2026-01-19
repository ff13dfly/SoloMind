# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-19

### Added
- **Core Microservices**:
  - `api/router`: Central API gateway with JSON-RPC over HTTP.
  - `api/agent`: AI agent service integrating Gemini, Qwen, and DeepSeek.
  - `api/user`: User management and authentication service.
  - `api/administrator`: System administration and capability management.
  - `api/orchestrator`: Workflow orchestration service.
  - `api/gateway`: External communication (Email/SMS) service.
  - `api/guardian`: System deployment and portal management service.
- **Frontend Clients**:
  - `client/mobile`: Mobile-first chat interface with React/Vite.
  - `portal`: System management dashboard.
- **Documentation**:
  - Comprehensive guides for Architecture, Protocols, and APIs (zh/en).
  - Local SSL debugging guide.
- **Protocol**:
  - AI Workflow Protocol for multi-service choreography.
  - Semantic Capability Discovery protocol.

### Security
- Local SSL support via `mkcert` and `local-ssl-proxy`.
- Role-based access control (RBAC).

### Infrastructure
- `deploy/run.sh` and `services.json` for local process management.
- Redis Stack integration for vector search and structured data.
