# API 概述

SoloMind 提供 RESTful API 和 JSON-RPC 接口。

## 认证

所有 API 请求需要在 Header 中携带认证信息：

```
Authorization: Bearer <your-token>
```

## 基础 URL

```
http://localhost:3000/api
```

## 响应格式

所有 API 返回统一的 JSON 格式：

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

## 错误处理

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

## API 列表

- Agent API - AI 意图识别和参数提取（文档编写中）
