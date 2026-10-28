#!/usr/bin/env bash
# Export the Touqi PostgreSQL database and uploaded files into one backup package.
set -Eeuo pipefail

SCRIPT_VERSION="1"
ONLINE=0
KEEP_STAGING=0
PROJECT_DIR=""
OUTPUT_DIR=""
DB_SERVICE="${TOUQI_DB_SERVICE:-postgres}"

usage() {
    cat <<'EOF'
用法：
  ./backup.sh [选项]

选项：
  --project-dir DIR  Docker Compose 项目目录（默认自动查找）
  --output-dir DIR   备份输出目录（默认：项目目录/backups）
  --online            不停止 backend/nginx；可能导致上传文件与数据库不是同一时点
  --keep-staging     失败时保留临时目录，便于排查
  -h, --help         显示帮助

备份包包含：
  PostgreSQL 逻辑备份、PostgreSQL 全局对象脚本、data/uploads、校验和及清单。
EOF
}

fail() {
    printf '错误：%s\n' "$*" >&2
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --project-dir)
            [[ $# -ge 2 ]] || fail "--project-dir 需要一个目录"
            PROJECT_DIR=$2
            shift 2
            ;;
        --output-dir)
            [[ $# -ge 2 ]] || fail "--output-dir 需要一个目录"
            OUTPUT_DIR=$2
            shift 2
            ;;
        --online)
            ONLINE=1
            shift
            ;;
        --keep-staging)
            KEEP_STAGING=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            fail "未知选项：$1（使用 --help 查看用法）"
            ;;
    esac
done

command -v docker >/dev/null 2>&1 || fail "未找到 docker，请先安装 Docker"

if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
else
    fail "未找到可用的 Docker Compose（docker compose 或 docker-compose）"
fi

absolute_dir() {
    local dir=$1
    [[ -d "$dir" ]] || fail "目录不存在：$dir"
    (cd "$dir" && pwd -P)
}

find_project_dir() {
    local start=$1
    local current
    current=$(absolute_dir "$start")
    while :; do
        if [[ -f "$current/docker-compose.yml" ]]; then
            printf '%s\n' "$current"
            return 0
        fi
        if [[ -f "$current/docker-compose.yaml" ]]; then
            printf '%s\n' "$current"
            return 0
        fi
        [[ "$current" == "/" ]] && break
        current=$(dirname "$current")
    done
    return 1
}

if [[ -n "$PROJECT_DIR" ]]; then
    PROJECT_DIR=$(absolute_dir "$PROJECT_DIR")
elif PROJECT_DIR=$(find_project_dir "$PWD"); then
    :
elif PROJECT_DIR=$(find_project_dir "$(dirname "${BASH_SOURCE[0]}")"); then
    :
else
    fail "找不到 docker-compose.yml，请在项目目录执行，或使用 --project-dir 指定"
fi

if [[ -f "$PROJECT_DIR/docker-compose.yml" ]]; then
    COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
else
    COMPOSE_FILE="$PROJECT_DIR/docker-compose.yaml"
fi

cd "$PROJECT_DIR"
COMPOSE+=(--project-directory "$PROJECT_DIR" -f "$COMPOSE_FILE")
if [[ -f "$PROJECT_DIR/.env" ]]; then
    COMPOSE+=(--env-file "$PROJECT_DIR/.env")
fi

if [[ -z "$OUTPUT_DIR" ]]; then
    OUTPUT_DIR="$PROJECT_DIR/backups"
elif [[ "$OUTPUT_DIR" != /* ]]; then
    OUTPUT_DIR="$PROJECT_DIR/$OUTPUT_DIR"
fi
mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR=$(absolute_dir "$OUTPUT_DIR")
chmod 700 "$OUTPUT_DIR"

"${COMPOSE[@]}" config --quiet || fail "Docker Compose 配置校验失败"
mapfile -t SERVICES < <("${COMPOSE[@]}" config --services)
printf '%s\n' "${SERVICES[@]}" | grep -Fxq "$DB_SERVICE" || fail "Compose 中不存在数据库服务：$DB_SERVICE"

# These flags let the EXIT trap restore exactly the services that were running before us.
BACKEND_WAS_RUNNING=0
NGINX_WAS_RUNNING=0
DB_STARTED_BY_SCRIPT=0
DB_CONTAINER_ID=""
DUMP_CONTAINER_PATH=""
GLOBALS_CONTAINER_PATH=""
STAGE=""

service_container_id() {
    "${COMPOSE[@]}" ps -q "$1" 2>/dev/null | tr -d '\r' | head -n 1
}

service_is_running() {
    local service=$1
    local container_id
    container_id=$(service_container_id "$service")
    [[ -n "$container_id" ]] || return 1
    [[ "$(docker inspect -f '{{.State.Running}}' "$container_id" 2>/dev/null || true)" == "true" ]]
}

cleanup() {
    local status=$?
    set +e

    if [[ "$BACKEND_WAS_RUNNING" == 1 ]]; then
        "${COMPOSE[@]}" start backend >/dev/null 2>&1 || true
    fi
    if [[ "$NGINX_WAS_RUNNING" == 1 ]]; then
        "${COMPOSE[@]}" start nginx >/dev/null 2>&1 || true
    fi
    if [[ "$DB_STARTED_BY_SCRIPT" == 1 ]]; then
        "${COMPOSE[@]}" stop "$DB_SERVICE" >/dev/null 2>&1 || true
    fi
    if [[ -n "$DB_CONTAINER_ID" ]]; then
        [[ -z "$DUMP_CONTAINER_PATH" ]] || docker exec "$DB_CONTAINER_ID" rm -f -- "$DUMP_CONTAINER_PATH" >/dev/null 2>&1 || true
        [[ -z "$GLOBALS_CONTAINER_PATH" ]] || docker exec "$DB_CONTAINER_ID" rm -f -- "$GLOBALS_CONTAINER_PATH" >/dev/null 2>&1 || true
    fi
    if [[ -n "$STAGE" && "$KEEP_STAGING" != 1 ]]; then
        rm -rf "$STAGE"
    elif [[ -n "$STAGE" && -d "$STAGE" ]]; then
        printf '临时文件已保留：%s\n' "$STAGE" >&2
    fi

    if [[ "$status" -ne 0 ]]; then
        printf '备份失败，未生成最终备份包。\n' >&2
    fi
    exit "$status"
}
trap cleanup EXIT

if ! service_is_running "$DB_SERVICE"; then
    printf '数据库服务未运行，正在启动：%s\n' "$DB_SERVICE"
    "${COMPOSE[@]}" up -d "$DB_SERVICE"
    DB_STARTED_BY_SCRIPT=1
fi

printf '等待 PostgreSQL 就绪……\n'
ready=0
for _ in $(seq 1 60); do
    if "${COMPOSE[@]}" exec -T "$DB_SERVICE" sh -ceu \
        'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1'; then
        ready=1
        break
    fi
    sleep 1
done
[[ "$ready" == 1 ]] || fail "PostgreSQL 在 60 秒内没有就绪"
DB_CONTAINER_ID=$(service_container_id "$DB_SERVICE")
[[ -n "$DB_CONTAINER_ID" ]] || fail "无法获取 PostgreSQL 容器 ID"

if [[ "$ONLINE" == 0 ]]; then
    if service_is_running backend; then
        BACKEND_WAS_RUNNING=1
        "${COMPOSE[@]}" stop backend
    fi
    if service_is_running nginx; then
        NGINX_WAS_RUNNING=1
        "${COMPOSE[@]}" stop nginx
    fi
else
    printf '警告：使用 --online，备份期间不会停止 backend/nginx。\n' >&2
fi

umask 077
STAGE=$(mktemp -d "${TMPDIR:-/tmp}/touqi-backup.XXXXXX")
mkdir -p "$PROJECT_DIR/data/uploads"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
PACKAGE_NAME="touqi-backup-${STAMP}.tar.gz"
PACKAGE_PATH="$OUTPUT_DIR/$PACKAGE_NAME"
index=1
while [[ -e "$PACKAGE_PATH" || -e "$PACKAGE_PATH.sha256" ]]; do
    PACKAGE_NAME="touqi-backup-${STAMP}-$(printf '%02d' "$index").tar.gz"
    PACKAGE_PATH="$OUTPUT_DIR/$PACKAGE_NAME"
    index=$((index + 1))
done

DUMP_BASENAME=".touqi-pg-${STAMP}.dump"
GLOBALS_BASENAME=".touqi-pg-${STAMP}.globals.sql"
DUMP_CONTAINER_PATH="/tmp/$DUMP_BASENAME"
GLOBALS_CONTAINER_PATH="/tmp/$GLOBALS_BASENAME"

printf '[1/5] 导出 PostgreSQL 数据……\n'
docker exec "$DB_CONTAINER_ID" sh -ceu \
    'dump_path=$1
     export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD 未配置}"
     pg_dump -Fc --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$dump_path"' \
    sh "$DUMP_CONTAINER_PATH"
docker cp "$DB_CONTAINER_ID:$DUMP_CONTAINER_PATH" "$STAGE/postgres.dump"
[[ -s "$STAGE/postgres.dump" ]] || fail "pg_dump 生成了空文件"

printf '[2/5] 导出 PostgreSQL 全局对象……\n'
docker exec "$DB_CONTAINER_ID" sh -ceu \
    'dump_path=$1
     export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD 未配置}"
     pg_dumpall --globals-only --no-role-passwords -U "$POSTGRES_USER" > "$dump_path"' \
    sh "$GLOBALS_CONTAINER_PATH"
docker cp "$DB_CONTAINER_ID:$GLOBALS_CONTAINER_PATH" "$STAGE/postgres-globals.sql"
[[ -s "$STAGE/postgres-globals.sql" ]] || fail "pg_dumpall 生成了空文件"

printf '[3/5] 打包上传文件……\n'
tar -C "$PROJECT_DIR/data" -czf "$STAGE/uploads.tar.gz" uploads

printf '[4/5] 校验备份内容……\n'
docker exec "$DB_CONTAINER_ID" pg_restore --list "$DUMP_CONTAINER_PATH" >/dev/null 2>&1 \
    || fail "PostgreSQL 备份格式校验失败"
tar -tzf "$STAGE/uploads.tar.gz" >/dev/null
(
    cd "$STAGE"
    sha256sum postgres.dump postgres-globals.sql uploads.tar.gz > SHA256SUMS
    sha256sum -c SHA256SUMS >/dev/null
)

cat > "$STAGE/manifest.txt" <<EOF
Touqi backup manifest
script_version=$SCRIPT_VERSION
created_at_utc=$STAMP
project_dir=$PROJECT_DIR
compose_file=$COMPOSE_FILE
database_service=$DB_SERVICE
includes=postgres.dump,postgres-globals.sql,uploads.tar.gz
online_mode=$([[ "$ONLINE" == 1 ]] && printf true || printf false)

This package does not contain .env or Docker volume raw files.
Run: sha256sum -c SHA256SUMS
EOF

cat > "$STAGE/README.txt" <<EOF
Touqi 云端备份包

创建时间（UTC）：$STAMP

文件：
- postgres.dump          PostgreSQL 自定义格式逻辑备份
- postgres-globals.sql   PostgreSQL 角色/全局对象（不含角色密码）
- uploads.tar.gz         项目 data/uploads 文件
- SHA256SUMS             包内文件校验和
- manifest.txt           备份清单

恢复前请先备份目标环境现有数据库。数据库恢复建议使用：
  docker compose exec -T postgres psql -U <用户> -d <数据库> -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
  docker compose exec -T postgres pg_restore -U <用户> -d <数据库> --no-owner --no-acl --exit-on-error < postgres.dump

不要把本文件或 postgres.dump 放到网站公开目录。
EOF

printf '[5/5] 生成压缩备份包……\n'
TMP_PACKAGE=$(mktemp "$OUTPUT_DIR/.touqi-package.XXXXXX")
tar -C "$STAGE" -czf "$TMP_PACKAGE" \
    postgres.dump postgres-globals.sql uploads.tar.gz SHA256SUMS manifest.txt README.txt
tar -tzf "$TMP_PACKAGE" >/dev/null
mv "$TMP_PACKAGE" "$PACKAGE_PATH"
printf '%s  %s\n' "$(sha256sum "$PACKAGE_PATH" | cut -d ' ' -f 1)" "$PACKAGE_NAME" \
    > "$PACKAGE_PATH.sha256"
chmod 600 "$PACKAGE_PATH" "$PACKAGE_PATH.sha256"

printf '\n备份完成：\n  %s\n  %s\n' "$PACKAGE_PATH" "$PACKAGE_PATH.sha256"
printf '下载示例：scp <用户>@<服务器>:%q .\n' "$PACKAGE_PATH"
