# 2026-01-19: 核心服务迁移 (Agent & User)

> 本文记录了通过 AI 协作完成核心后台服务迁移的过程。

## 对话目标

将之前项目 (fang) 中的核心智能体服务 `api/agent` 和用户管理服务 `api/user` 迁移到 SoloMind 项目中。

## 对话过程

### 第一轮：迁移 api/agent

**我说**：git提交到本地

**AI 做了**：
- 检查当前仓库状态，发现 `api/agent` 尚未提交。
- 初始化 `task.md` 跟踪进度。
- 将 `api/agent` 全部文件加入暂存区。
- 提交代码，编写详细的 commit message 描述智能体核心功能。

### 第二轮：迁移 api/user

**我说**：将fang/api/user移动过来

**AI 做了**：
- 确认源目录 `../fang/api/user` 存在。
- 将 `api/user` 目录完整复制到当前项目中。
- 清理冗余的 `node_modules` 和 `debug.log`。
- 检查 `config.js` 确保配置项符合 SoloMind 环境。
- 提交代码，详细说明了用户注册、登录挑战及权限分类功能。

### 第三轮：服务自省优化与项目清理

**我说**：优化服务自省逻辑，清理冗余脚本，配置部署脚本。

**AI 做了**：
- **自省元数据迁移**：将 API 返回字段 (`returns`) 从 Router 的硬编码文件迁移至 `api/user`, `api/agent`, `api/administrator` 各自的自省响应中。
- **深度清理**：彻底删除了各服务中残留的调试脚本、Mock 数据和历史测试存档（共计 20+ 文件）。
- **依赖管理重构**：引入 `npm workspaces`，将各服务的 `node_modules` 统一管理在 `api/` 根目录下。
- **自动化部署工具**：在 `deploy/` 目录下创建了 `run.sh`, `shutdown.sh` 和 `services.json`，实现了微服务的一键动态启停。

---

## 本次对话产出

| 类型 | 数量 |
|------|------|
| 新建目录 | 1 (`deploy/`) |
| 新建文件 | 5 (`deploy/run.sh`, `deploy/shutdown.sh`, `deploy/services.json`, `api/package.json`, `api/package-lock.json`) |
| 删除文件 | 25+ (冗余脚本与硬编码数据) |
| 修改文件 | 5 (核心配置与逻辑更新) |

## 经验总结

- **动态化设计**：通过自省协议 (`methods`) 传递元数据，比硬编码文件更能适应微服务架构的灵活变动。
- **统一依赖管理**：在微服务项目中，使用 `workspaces` 可以极大减少磁盘占用并简化CI/CD流程。
- **Shell 兼容性**：在编写部署脚本时，应优先使用 `printf` 而非 `echo -e` 以保证在不同 Unix 系统/Shell 环境下的一致表现。

## 待办

- [x] 初始化 `api/user` 的 Redis 角色数据（运行 `seed_role.js`）。
- [x] 验证 `api/router` 的动态能力发现逻辑。
- [ ] 逐步将其他剩余服务迁移至新的部署架构。
