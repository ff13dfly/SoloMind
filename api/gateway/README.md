# Gateway Service

外部通信网关服务，负责与第三方服务集成（邮件、短信等）。

> [!NOTE]
> 此服务作为系统对外通信的统一出口，由内部服务通过 `_tasks` 机制调用。

## 功能

| 方法 | 描述 | 提供商 |
|------|------|--------|
| `gateway.email.send` | 发送邮件 | SendGrid / SES |
| `gateway.sms.send` | 发送短信 | 阿里云 SMS / Twilio |
| `gateway.ping` | 健康检查 | - |
| `gateway.echo` | 回显测试 | - |

## 目录结构

```
api/gateway/
├── index.js            # 服务入口
├── config.js           # 配置（端口、API Key 等）
├── package.json
├── handlers/
│   ├── auth.js         # Router 握手认证
│   ├── bootstrap.js    # Redis 初始化
│   └── introspection.js# 方法自省
├── logic/
│   └── index.js        # 业务逻辑（邮件、短信发送）
└── tests/
```

## 配置

在环境变量或 `config.js` 中配置：

```bash
GATEWAY_PORT=4020
EMAIL_API_KEY=your_sendgrid_key
SMS_API_KEY=your_aliyun_key
SMS_SIGN_NAME=SoloMind
```

## 调用示例

由其他服务通过 `_tasks` 返回调用：

```json
{
  "result": {
    "data": { "message": "操作成功" },
    "_tasks": [
      {
        "service": "gateway",
        "method": "gateway.sms.send",
        "params": { "phone": "+86138xxxx", "code": "123456" }
      }
    ]
  }
}
```

Router 会提取 `_tasks` 并转发到本服务执行。
