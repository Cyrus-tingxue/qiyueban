# Touqi Go API

这是兼容现有 FastAPI 接口的 Gin + GORM 后端。服务仍使用 `/api` 前缀、同一个 PostgreSQL schema、同一个 `data/uploads` 目录以及现有 HS256 JWT。

## 本地开发

```bash
go test ./...
go vet ./...
go run ./cmd/server
```

必需配置：`DATABASE_URL`、`SECRET_KEY`。Compose 会从根目录 `.env` 注入其余配置。

## 数据库迁移

生产数据库迁移不使用 GORM `AutoMigrate`。首次部署前先执行逻辑备份，并在维护窗口执行一次性 `migrate` 服务：

```bash
docker compose run --rm migrate
docker compose up -d --build
```

`migrations/0001_baseline.sql` 是对当前 PostgreSQL schema 的非破坏性基线：使用 `IF NOT EXISTS`，不会删除数据或字段。后续 schema 变化必须增加编号 migration，并先在备份恢复的 staging 数据库验证。

如果迁移服务失败，不要启动 Go backend；修复原因或切回 `backup/pre-go-rewrite-20261028` 对应的 Python 部署。

## 兼容性约束

- JWT 必须使用 HS256，payload 的 `sub` 为字符串用户 ID，`exp` 使用 Unix 时间戳。
- 错误体保持 `{ "detail": "..." }`。
- 时间展示保持 `YYYY-MM-DD HH:mm`（Asia/Shanghai）。
- 上传字段为 multipart `file`，URL 为 `/api/uploads/<uuid>.<ext>`。
- `INVITE_CODE` 用于恢复前端使用的 `/auth/verify-invite`；生产环境应显式设置随机值，不要依赖默认邀请码。
- `ANTHROPIC_*` 当前配置实际上连接 OpenAI-compatible Chat Completions 服务；AI 适配器迁移完成前不要切换 provider。
