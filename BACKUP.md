# 云端一键备份与恢复

## 1. 在云服务器生成备份包

把仓库根目录的 `backup.sh` 放到云服务器的 Compose 项目根目录（与 `docker-compose.yml` 同级），然后执行：

```bash
chmod +x backup.sh
./backup.sh
```

脚本默认会：

1. 检查 Docker Compose 配置和 `postgres` 服务；
2. 如果 PostgreSQL 没启动，先启动它并在结束时恢复原状态；
3. 默认短暂停止当时正在运行的 `backend` 和 `nginx`，尽量让数据库与上传文件处于同一时点；
4. 使用容器内的 `pg_dump` 导出 PostgreSQL，不直接复制 `postgres-data` 命名卷；
5. 打包项目下的 `data/uploads`；
6. 在 `backups/` 生成带时间戳的 `.tar.gz` 和 `.sha256` 文件。

脚本不会覆盖旧备份，也不会把 `.env` 放进备份包。备份包含用户数据和数据库内容，应限制访问权限。

如果不能接受短暂停机，可以使用：

```bash
./backup.sh --online
```

`--online` 不停止应用，但备份期间正在变化的文件可能与数据库不是同一个时点。还可以指定项目和输出目录：

```bash
./backup.sh --project-dir /opt/touqi --output-dir /var/backups/touqi
```

如果数据库 Compose service 名称不是 `postgres`：

```bash
TOUQI_DB_SERVICE=db ./backup.sh
```

## 2. 下载备份包

在本地电脑执行（将服务器用户、地址和路径替换为实际值）：

```bash
scp root@SERVER_IP:/opt/touqi/backups/touqi-backup-<时间戳>.tar.gz .
scp root@SERVER_IP:/opt/touqi/backups/touqi-backup-<时间戳>.tar.gz.sha256 .
sha256sum -c touqi-backup-<时间戳>.tar.gz.sha256
```

如果本地是 Windows，Git Bash、WSL 或支持 `sha256sum` 的环境可以直接执行上面的校验命令。不要通过 Nginx 或其他公开 URL 下载备份包。

查看备份包内容：

```bash
tar -tzf touqi-backup-<时间戳>.tar.gz
```

解压：

```bash
mkdir touqi-backup-extracted
tar -xzf touqi-backup-<时间戳>.tar.gz -C touqi-backup-extracted
cd touqi-backup-extracted
sha256sum -c SHA256SUMS
```

## 3. 恢复到本地 Compose 环境

恢复会覆盖目标 PostgreSQL 中的同名业务数据。先确认你已经备份了本地数据库：

```bash
docker compose up -d postgres
docker compose exec -T postgres pg_dump -U touqi -d touqi -Fc \
  > touqi-local-before-restore.dump
```

将备份包解压后，在本地项目根目录执行。先停止会访问数据库的服务：

```bash
docker compose stop backend nginx
```

清空目标数据库 schema（只对确认可以覆盖的本地环境执行）：

```bash
docker compose exec -T postgres psql \
  -U "${POSTGRES_USER:-touqi}" \
  -d "${POSTGRES_DB:-touqi}" \
  -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
```

Windows PowerShell 不会按 Bash 方式展开上面的变量；如果使用 PowerShell，请直接把用户和数据库名替换为 `.env` 中的实际值，或在 Git Bash/WSL 中执行。

恢复数据库：

```bash
docker compose exec -T postgres pg_restore \
  -U "${POSTGRES_USER:-touqi}" \
  -d "${POSTGRES_DB:-touqi}" \
  --no-owner --no-acl --exit-on-error \
  < postgres.dump
```

如果需要恢复角色/全局对象，在确认目标环境允许后执行 `postgres-globals.sql`；脚本默认不包含角色密码：

```bash
docker compose exec -T postgres psql \
  -U "${POSTGRES_USER:-touqi}" \
  -d postgres \
  < postgres-globals.sql
```

恢复上传文件（先备份或移走本地现有目录）：

```bash
mv data/uploads data/uploads.before-restore 2>/dev/null || true
tar -xzf uploads.tar.gz -C data
```

启动并验证：

```bash
docker compose up -d --build
curl http://localhost:8000/api/health
```

应返回类似：

```json
{"status":"ok","name":"柒月半 API"}
```

## 4. 注意事项

- `postgres-data` 是 Docker 命名卷，脚本使用 `pg_dump` 生成可迁移的逻辑备份，因此不依赖云服务器上的实际卷名。
- 默认备份会短暂停止 `backend` 和 `nginx`，但不会停止正在运行的 PostgreSQL；脚本退出时会恢复备份前的运行状态。
- `--online` 适合不能停机的场景，但无法保证数据库记录与文件完全同时刻。
- 备份包包含用户信息、帖子、消息、密码哈希以及上传文件。请使用 SSH/SCP 传输，并限制备份目录权限。
- 备份脚本不会备份 `.env`、Docker 镜像或 PostgreSQL 原始数据卷。恢复时需在目标环境自行准备正确的 `.env`。
- 云服务器上的 `.env` 含有数据库、SMTP 和 AI 服务凭据，不要将它放进备份包或提交到 Git；已暴露的凭据应及时轮换。
