# Guardian Service

运维守护服务，提供系统部署、入口控制和安全重置功能。

> [!CAUTION]
> 此服务权限极高，所有操作仅限管理员角色调用，需记录完整审计日志。

## 功能规划

### 1. 代码部署 (`deploy.*`)

自动化部署流程，类似 Jenkins 的核心功能。

| 方法 | 描述 |
|------|------|
| `deploy.pull` | 从 Git 仓库拉取最新代码 |
| `deploy.install` | 安装依赖 (`npm install`) |
| `deploy.restart` | 重启服务 (`pm2 restart`) |
| `deploy.status` | 查看部署状态和最近日志 |
| `deploy.rollback` | 回滚到上一版本 |

**实现路径**：
- 使用 `simple-git` 操作 Git
- 使用 `ssh2` 远程执行命令（如需部署到其他服务器）
- 使用 `child_process` 本地执行命令

### 2. Portal 入口控制 (`portal.*`)

控制前端访问入口，实现按需开放。

| 方法 | 描述 |
|------|------|
| `portal.disable` | 备份并删除 `index.html`，关闭入口 |
| `portal.enable` | 恢复 `index.html`，开放入口 |
| `portal.status` | 查看当前入口状态 |
| `portal.switch` | 切换到指定版本的入口文件 |

**实现路径**：
- 使用 Node.js 内置 `fs` 模块
- 备份文件存储在 `./backups/` 目录
- 支持多版本入口文件管理

### 3. 管理员安全 (`admin.*`)

管理员密码重置和安全验证。

| 方法 | 描述 |
|------|------|
| `admin.sendCode` | 生成验证码，通过 `_tasks` 委托 Gateway 发送短信 |
| `admin.verifyCode` | 验证短信码 |
| `admin.resetPassword` | 验证通过后重置密码 |
| `admin.bindPhone` | 绑定/更新手机号（需原密码验证） |

**实现路径**：
- 验证码存储：Redis，5 分钟过期
- 短信发送：通过 `_tasks` 返回给 Router，由 Router 转发到 Gateway 服务
- 限流：同一手机号 60 秒内仅发 1 次

**Task 返回示例**（参考 [工作流协议 - 任务分发](../docs/zh/protocol/workflow.md#4-任务分发)）：

```json
{
  "result": {
    "data": { "message": "验证码已发送" },
    "_tasks": [
      {
        "service": "gateway",
        "method": "sms.send",
        "params": { "phone": "+86138xxxx", "code": "123456" }
      }
    ]
  }
}
```

## 目录结构规划

```
api/guardian/
├── README.md           # 本文件
├── index.js            # 服务入口
├── package.json
├── config.js           # 配置（短信 API Key、部署路径等）
├── handlers/
│   ├── deploy.js       # 部署相关处理
│   ├── portal.js       # 入口控制处理
│   └── admin.js        # 管理员安全处理
├── logic/
│   ├── git.js          # Git 操作封装
│   └── ssh.js          # SSH 远程执行封装
└── tests/
    └── *.test.js
```

## 依赖规划

```json
{
  "dependencies": {
    "simple-git": "^3.x",
    "ssh2": "^1.x"
  }
}
```

## 安全要求

- [ ] 所有方法需验证 `isAdmin === true`
- [ ] 操作日志写入 Redis `GUARDIAN:AUDIT_LOG`
- [ ] 短信验证码限流（60s/次，5次/天）
- [ ] 部署操作需二次确认机制
