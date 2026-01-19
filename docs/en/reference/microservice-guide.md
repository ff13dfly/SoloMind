# Microservice Development Guide

> **Reference**: `api/sample`

This document standardizes the directory structure and development patterns for business microservices. All new services should follow this structure.

## Directory Structure

```
api/service-name/
├── config.js           # Configuration (port, DB, constants)
├── index.js            # Entry (start server, connect Redis)
├── package.json        # Dependencies
├── handlers/           # [Interface Layer] JSON-RPC handlers
│   ├── introspection.js # Capability declarations
│   ├── entities.js      # Data schema definitions
│   └── ...             # Business handlers
├── logic/              # [Logic Layer] Pure business logic
│   ├── index.js        # Unified export
│   └── ...             # Business logic
└── tests/              # Unit & integration tests
```

## Data Planning

### Multi-Entity Architecture

Define each data type as an independent entity.

```
Example: api/asset
├── warehouse
├── section
├── unit
└── stuff
```

### Design Principles

| Principle | Description |
|-----------|-------------|
| **Nesting Depth** | Max 3 levels |
| **Single Responsibility** | Logic contained within microservice |
| **Soft Delete** | Support `isArchived` field |
| **Foreign Key Naming** | Use `targetServiceName + Id` format |

## API Planning

### Naming Convention

Format: `service_name.entity_name.method`

```
Example: new_service.contract.create
         new_service.contract.search
```

### Standard API Methods

| Method | Description |
|--------|-------------|
| `create` | Create entity |
| `update` | Update entity |
| `get` | Get single entity |
| `delete` | Physical delete (use carefully) |
| `archive` | Soft delete |
| `recover` | Restore |
| `list` | Get list |
| `search` | Advanced search |

### Required System APIs

| Method | Description | Consumer |
|--------|-------------|----------|
| `methods` | Introspection, returns all RPC methods | Agent |
| `entities` | Entity definitions, returns data schema | Agent |
| `ping` | Health check | Router |

## Layered Architecture

We strictly follow **Handler (Controller) - Logic (Service)** pattern.

### Interface Layer (`handlers/`)

- Receive JSON-RPC requests
- Parameter validation
- Permission checks
- Call logic layer
- Format responses

### Logic Layer (`logic/`)

- Core business rules
- Database operations
- Cross-service interactions

## Service Registration

After development, register the service with Router.

### Registration Steps

1. **Start service**: Listen on port (e.g., `http://localhost:3700`)
2. **Call registration API**:
   ```bash
   curl -X POST http://localhost:3600/api/rpc \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "system.add_service",
       "params": { "url": "http://localhost:3700" },
       "id": 1
     }'
   ```
3. **Handshake**: Router performs Z-Handshake verification
4. **Introspection**: Router pulls and caches API capabilities

## Development Workflow

1. **Define capabilities** in `handlers/introspection.js`
2. **Implement logic** in `logic/`
3. **Create handlers** in `handlers/`
4. **Register service** via `system.add_service`

## Example Code

See `api/sample` directory for reference implementations.
