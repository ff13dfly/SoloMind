# API Overview

SoloMind provides RESTful API and JSON-RPC interfaces.

## Authentication

All API requests require authentication in the Header:

```
Authorization: Bearer <your-token>
```

## Base URL

```
http://localhost:3000/api
```

## Response Format

All APIs return a unified JSON format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

## Error Handling

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

## API List

- Agent API - AI intent recognition and parameter extraction (Documentation in progress)
