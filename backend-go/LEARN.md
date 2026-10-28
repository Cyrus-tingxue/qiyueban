# 柒月半 Go 后端入门教程

> 这篇文档写给第一次接触 Go、Gin、GORM 和 Docker 的开发者。你不需要一次理解所有代码，建议按照“先跑起来 → 看启动链路 → 看一个接口 → 看数据库 → 再改代码”的顺序学习。

---

## 1. 这个后端项目是什么

这个目录是柒月半项目的 Go 后端：

```text
FastAPI/Python 旧后端
        ↓（接口保持兼容）
Gin + GORM + PostgreSQL 的 Go 后端
```

它提供这些能力：

- 用户注册、登录、JWT 鉴权；
- 用户资料、修改密码、邮箱验证和找回密码；
- 帖子、回复、点赞；
- 坟贴申请和管理员审核；
- 通知、好友、私聊；
- 群聊、群邀请、群消息；
- 公告和 App 版本；
- 图片上传；
- `@小柒` 时调用 OpenAI-compatible API 生成机器人回复。

前端通过 HTTP 请求调用它。例如：

```text
GET  /api/health
GET  /api/posts
POST /api/auth/login
POST /api/posts
```

后端使用 PostgreSQL 保存业务数据，使用项目根目录的 `data/uploads` 保存上传图片。

---

## 2. 先认识目录

当前 `backend-go` 的目录如下：

```text
backend-go/
├── cmd/                         # 可执行程序入口
│   ├── server/main.go           # 启动真正的 Web API
│   └── migrate/main.go          # 执行数据库 SQL migration
├── internal/                    # 只给本项目内部使用的 Go 包
│   ├── config/config.go         # 读取环境变量
│   ├── db/
│   │   ├── db.go                # 打开 PostgreSQL/GORM 连接
│   │   └── migrate.go           # migration 辅助函数
│   ├── model/models.go          # PostgreSQL 表对应的 GORM 结构体
│   └── httpapi/
│       ├── server.go             # 路由、鉴权、公开接口、上传
│       ├── posts_extra.go        # 帖子、回复、点赞、坟贴
│       ├── social.go             # 通知、好友、私聊
│       ├── groups.go             # 群聊、群邀请、群消息
│       ├── admin.go              # 管理员接口、公告、版本
│       ├── auth_extra.go         # 邮箱、搜索、密码找回
│       ├── ai.go                 # @小柒 自动回复
│       ├── mail.go               # SMTP 邮件发送
│       ├── helpers.go            # handler 共用辅助函数
│       ├── response.go           # 统一错误/提示响应
       └── time.go               # Asia/Shanghai 时间格式
├── migrations/
│   └── 0001_baseline.sql        # PostgreSQL 基线表结构
├── Dockerfile                    # 构建 Web API 镜像
├── Dockerfile.migrate            # 构建一次性 migration 镜像
├── go.mod                        # Go 模块和直接依赖
└── go.sum                        # 依赖的完整校验信息
```

### 为什么有 `cmd` 文件夹？

Go 项目经常把“可执行程序入口”放在 `cmd` 下。一个项目可以有多个可执行程序：

```text
cmd/server  → 编译成 touqi-api       → 长期运行，接收 HTTP 请求
cmd/migrate → 编译成 touqi-migrate    → 执行 SQL，完成后退出
```

这两个目录都使用 `package main`，因为它们分别是两个独立的程序。它们会复用 `internal/config` 和 `internal/db`，但用途不同。

### `internal` 是什么？

`internal` 是 Go 的特殊目录。位于它里面的包只能被同一个项目内部导入，项目外部不能直接使用。这可以防止别人把本项目内部实现当成公共 SDK。

---

## 3. `cmd/server/main.go`：Web 服务如何启动

打开 `cmd/server/main.go`，核心流程是：

```go
cfg := config.Load()
database, err := db.Open(cfg)
server := httpapi.New(database, cfg)
httpServer := &http.Server{
    Addr: ":" + cfg.Port,
    Handler: server.Router(),
}
httpServer.ListenAndServe()
```

逐步解释：

1. `config.Load()` 读取 `.env` 通过 Docker 注入的环境变量；
2. `db.Open(cfg)` 使用 GORM 打开 PostgreSQL 连接；
3. `httpapi.New(...)` 创建 API 服务对象；
4. `server.Router()` 注册 Gin 路由和中间件；
5. `ListenAndServe()` 在 `PORT` 端口监听 HTTP 请求；
6. 收到 `SIGINT` 或 `SIGTERM` 时执行优雅关闭，让正在处理的请求有机会完成。

本地直接运行时，需要先准备 PostgreSQL 和环境变量：

```bash
go run ./cmd/server
```

但对于初学者，推荐使用 Docker Compose，因为 Docker 会自动准备 PostgreSQL、网络、数据卷和环境变量。

---

## 4. `cmd/migrate/main.go`：数据库结构如何准备

`cmd/migrate` 不是 Web 服务。它的工作是：

```text
连接 PostgreSQL
    ↓
等待/检查数据库可连接
    ↓
读取 migrations/0001_baseline.sql
    ↓
执行 SQL
    ↓
打印完成并退出
```

它不会调用 GORM 的 `AutoMigrate`，也不会主动删除表。当前 SQL 使用：

```sql
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS ...;
INSERT INTO schema_migrations (...) VALUES (...) ON CONFLICT DO NOTHING;
```

因此已经存在的表和数据不会因为重复运行而被清空。

### migration 和业务数据的区别

```text
migrations/0001_baseline.sql = 表结构说明
PostgreSQL postgres-data      = 真正的用户、帖子、消息数据
```

例如：

```text
users 表定义了 username、password_hash、avatar 等列
users 表中的 5884 行才是真实用户数据
```

SQL migration 不会从云端恢复用户数据。备份和恢复由根目录的 `backup.sh` 负责。

### 为什么不把所有 SQL 写进 server 启动过程？

因为 Web 服务启动时自动修改生产数据库结构容易造成不可控风险。现在把结构变更单独作为 `migrate` 容器，优点是：

- 迁移失败时 backend 不会继续启动；
- 数据库结构变化可以单独审查；
- 可以在部署前执行备份；
- 不会因为代码启动而隐式修改生产表。

以后新增结构，应该增加新文件，例如：

```text
migrations/0002_add_user_bio.sql
```

不要随意修改已经执行过的 migration 并期待旧数据库自动变化。

---

## 5. Docker Compose 的启动顺序

根目录的 `docker-compose.yml` 定义了这些服务：

```text
postgres   PostgreSQL 数据库
migrate    执行 SQL migration 的一次性容器
backend    Go Gin API
frontend   编译前端并把 dist 复制到共享卷
nginx      提供前端页面、上传文件和 API 反向代理
```

依赖关系是：

```text
postgres → migrate → backend
                         ↑
frontend ────────────────┘（Nginx 使用前端共享卷）
```

启动命令：

```bash
docker compose up -d --build
```

Docker 会：

1. 构建 Go backend 镜像；
2. 构建 migrate 镜像；
3. 构建前端镜像；
4. 启动 PostgreSQL；
5. 等待 PostgreSQL healthcheck 通过；
6. 执行 migrate；
7. migrate 成功退出；
8. 启动 Go backend；
9. 启动前端和 Nginx。

查看状态：

```bash
docker compose ps
```

查看 Go 日志：

```bash
docker compose logs -f backend
```

查看 migration 日志：

```bash
docker compose logs migrate
```

停止服务但保留数据库卷：

```bash
docker compose stop
```

删除容器但保留数据库卷：

```bash
docker compose down
```

**不要随便执行：**

```bash
docker compose down -v
```

`-v` 会删除 `postgres-data`，可能导致本地数据库数据丢失。

---

## 6. PostgreSQL 数据在哪里

Compose 中的配置：

```yaml
volumes:
  - postgres-data:/var/lib/postgresql/data
```

这表示 PostgreSQL 数据放在 Docker 命名卷 `postgres-data`，不是 `backend-go` 目录里的文件。

列出卷：

```bash
docker volume ls
```

查看容器：

```bash
docker compose ps
```

进入 PostgreSQL 容器执行 SQL：

```bash
docker compose exec postgres psql -U touqi -d touqi
```

查询表：

```sql
\dt
```

查询用户和帖子数量：

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM posts;
```

退出 psql：

```sql
\q
```

生产环境不要直接复制 PostgreSQL 正在使用的原始数据目录。使用根目录 `backup.sh` 的 `pg_dump` 逻辑备份更安全、更容易迁移。

---

## 7. GORM 模型如何对应 PostgreSQL 表

[internal/model/models.go](internal/model/models.go) 中的结构体代表数据库表：

```go
type User struct {
    ID       uint   `gorm:"column:id;primaryKey"`
    Username string `gorm:"column:username"`
}

func (User) TableName() string { return "users" }
```

可以这样理解：

```text
Go struct 字段       PostgreSQL 列
User.ID              users.id
User.Username        users.username
User.Avatar          users.avatar
```

`gorm` 标签告诉 GORM 列名、主键和索引信息；`TableName()` 明确指定表名。

当前项目的模型包括：

```text
User              users
Post              posts
Reply             replies
Like              likes
ReplyLike         reply_likes
Notification      notifications
Friendship        friendships
Message           messages
ChatGroup         chat_groups
ChatGroupMember   chat_group_members
ChatGroupInvite   chat_group_invites
GroupMessage      group_messages
GraveRequest      grave_requests
IpBan             ip_bans
Announcement      announcements
AppVersion        app_versions
Category          categories
```

模型是数据库映射，不等于 HTTP 响应。密码字段带有 `json:"-"`，表示不能直接返回给前端。

---

## 8. Gin 路由如何工作

[internal/httpapi/server.go](internal/httpapi/server.go) 的 `Router()` 注册路由：

```go
api.POST("/auth/login", s.login)
api.GET("/posts", s.posts)
api.POST("/posts", s.requireAuth(), s.createPost)
```

每条路由可以包含：

```text
HTTP 方法
路径
可选中间件
最终 handler 函数
```

例如：

```text
POST /api/posts
        ↓
requireAuth() 检查 JWT
        ↓
createPost() 解析 JSON、写入 posts 表、返回 JSON
```

公开接口不使用 `requireAuth()`：

```text
GET /api/posts
GET /api/categories
GET /api/health
```

需要登录的接口使用它：

```text
POST /api/posts
POST /api/posts/:id/like
GET /api/messages/friends
```

### 中间件

当前主要中间件：

- `gin.Logger()`：打印请求日志；
- `gin.Recovery()`：捕获 handler panic，避免整个进程退出；
- `cors()`：处理允许的前端来源；
- `ipBan()`：检查 IP 黑名单；
- `requireAuth()`：校验 JWT、查用户、检查封禁状态。

### JWT

登录成功后返回：

```json
{
  "token": "...",
  "user": {"uid": 1}
}
```

前端后续请求带：

```text
Authorization: Bearer <token>
```

当前 JWT 必须保持：

- HS256；
- `sub` 是字符串形式的用户 ID；
- `exp` 是 Unix 时间戳。

不要随意改变这些字段，否则旧前端和旧登录 token 可能不能使用。

---

## 9. 一个完整接口示例：获取帖子

请求：

```bash
curl "http://localhost:8000/api/posts?page=1&page_size=2"
```

执行路径大致是：

```text
Nginx :8000
    ↓ /api/
Go Gin Router
    ↓
Server.posts
    ↓
GORM 查询 posts 表
    ↓
postResponse 映射 JSON
    ↓
返回前端
```

返回结构：

```json
{
  "items": [
    {
      "id": 1,
      "title": "标题",
      "content": "内容",
      "category": "讨论",
      "author": "昵称",
      "author_id": 1,
      "author_avatar": "eye",
      "reply_count": 0,
      "like_count": 0,
      "is_liked": false,
      "is_grave": false,
      "created_at": "2026-10-29 12:30"
    }
  ],
  "total": 7365,
  "page": 1,
  "page_size": 2,
  "total_pages": 3683
}
```

注意：`author_avatar` 需要根据 `author_id` 查询 `users.avatar`，不能只依赖帖子创建时保存的昵称快照。

---

## 10. 如何新增一个接口

建议按下面步骤做：

### 第一步：确认客户端契约

先确定：

```text
路径是什么？
HTTP 方法是什么？
是否需要登录？
请求 JSON 字段是什么？
成功返回什么？
错误状态码和 detail 是什么？
```

不要只凭感觉修改字段名，因为前端已经依赖现有接口。

### 第二步：确认数据库模型

如果只读现有表，可以复用 `model`。如果要新增表或字段，必须先设计 migration，不要直接用 `AutoMigrate`。

### 第三步：写 handler

handler 负责：

```text
读取路径参数/query/body
检查基础输入
调用数据库或业务函数
返回状态码和 JSON
```

复杂业务应继续拆到 service/repository，而不是让一个 handler 无限变长。

### 第四步：统一错误

使用：

```go
Error(c, http.StatusBadRequest, "请求参数无效")
```

返回：

```json
{"detail":"请求参数无效"}
```

前端通过 `err.response.data.detail` 显示错误，不要随意改成 `message`。

### 第五步：格式化和测试

```bash
gofmt -w .
go test ./...
go vet ./...
git diff --check
```

然后构建：

```bash
docker compose build backend
```

最后用 curl 或浏览器测试实际接口。

---

## 11. 图片上传为什么要看 `data/uploads`

上传接口：

```text
POST /api/upload/image
```

请求字段名必须是：

```text
file
```

Go backend 把文件写入容器内：

```text
/app/data/uploads
```

Compose 把宿主机目录挂载到这里：

```yaml
- ./data:/app/data
```

所以宿主机上最终看到：

```text
项目根目录/data/uploads/
```

Nginx 也挂载了同一个目录，并通过：

```text
/api/uploads/<文件名>
```

直接提供图片。

这就是为什么迁移服务器时，除了 PostgreSQL 数据，还必须保留 `data/uploads`。

---

## 12. AI 自动回复如何工作

旧 Python 后端在回复正文包含 `@小柒` 时调用 AI。Go 版本的逻辑在 [internal/httpapi/ai.go](internal/httpapi/ai.go)：

```text
用户提交回复
    ↓
回复先正常保存
    ↓
如果内容包含 @小柒
    ↓
后台 goroutine 调用 /v1/chat/completions
    ↓
创建 xiaoqi_bot 用户（不存在时）
    ↓
保存机器人回复
```

配置来自 `.env`：

```text
ANTHROPIC_AUTH_TOKEN=...
ANTHROPIC_BASE_URL=...
ANTHROPIC_MODEL=...
```

虽然变量名叫 `ANTHROPIC_*`，当前实现实际使用的是 OpenAI-compatible Chat Completions 请求格式。不要在没有确认服务商格式的情况下修改它。

AI 配置缺失或服务异常时，普通用户回复仍然应该成功。

---

## 13. 邮件功能如何工作

邮箱绑定和找回密码使用：

```text
SMTP_HOST
SMTP_PORT
SMTP_USERNAME
SMTP_PASSWORD
SMTP_FROM
SMTP_USE_TLS
```

验证码只保存 hash，不保存明文；验证码有过期时间。邮件密码、AI Token、数据库密码都不能打印到日志或提交 Git。

---

## 14. 常用学习和排错命令

检查 Compose：

```bash
docker compose config --quiet
```

查看所有服务：

```bash
docker compose ps
```

查看 backend 日志：

```bash
docker compose logs -f backend
```

进入 backend 容器：

```bash
docker compose exec backend sh
```

检查数据库健康：

```bash
docker compose exec postgres pg_isready -U touqi -d touqi
```

检查 API：

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/categories
curl "http://localhost:8000/api/posts?page=1&page_size=1"
```

停止日志查看：按 `Ctrl+C`，不会停止容器。

---

## 15. 推荐的学习顺序

### 第 1 天：只运行

```bash
docker compose up -d --build
curl http://localhost:8000/api/health
```

理解服务是否健康。

### 第 2 天：看启动

依次阅读：

```text
cmd/server/main.go
internal/config/config.go
internal/db/db.go
internal/httpapi/server.go 的 Router()
```

画出：

```text
请求 → Nginx → Gin → handler → GORM → PostgreSQL
```

### 第 3 天：看数据

阅读：

```text
migrations/0001_baseline.sql
internal/model/models.go
```

然后用 psql 查询 `users` 和 `posts`。

### 第 4 天：看一个业务

建议先看帖子：

```text
server.go       posts、post、postResponse
posts_extra.go  createPost、createReply、togglePostLike
model/models.go Post、Reply、Like
```

### 第 5 天：尝试小改动

例如给健康接口增加一个不影响客户端的字段，然后运行：

```bash
gofmt -w .
go test ./...
docker compose build backend
docker compose up -d backend
curl http://localhost:8000/api/health
```

先做小改动，不要一开始修改登录、数据库结构或消息状态机。

---

## 16. 最重要的安全规则

1. 不要提交 `.env`；
2. 不要执行 `docker compose down -v`，除非确定要删除本地数据库；
3. 修改数据库结构前先运行 `backup.sh`；
4. 不要把 `postgres-data` 当普通文件复制；
5. 不要把数据库密码、SMTP 密码、AI Token 写进 Go 源码；
6. 不要在日志中打印 JWT、密码和验证码；
7. 修改接口字段前先检查 frontend/mobile 的调用；
8. 生产部署前先在恢复备份的 staging 数据库验证。

如果你忘记了某个命令，优先看根目录的 `BACKUP.md`、本文件以及 `docker-compose.yml`，再看具体 Go 文件。
