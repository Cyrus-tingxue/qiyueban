#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$ROOT_DIR"

echo "=========================================="
echo "Docker migration: SQLite to PostgreSQL"
echo "=========================================="
echo
echo "This script will:"
echo "1. Start the postgres container"
echo "2. Build the backend image"
echo "3. Run the migration script inside the backend container"
echo "4. Run a basic validation step"
echo

SQLITE_FILE="$ROOT_DIR/data/touqi.db"
if [ ! -f "$SQLITE_FILE" ]; then
  echo "[ERROR] SQLite database not found:"
  echo "$SQLITE_FILE"
  exit 1
fi

BACKUP_FILE="$ROOT_DIR/data/qiyueban.db"

echo "[0/4] Backing up SQLite database..."
cp "$SQLITE_FILE" "$BACKUP_FILE"

echo "[1/4] Starting PostgreSQL..."
docker compose up -d postgres

echo "Waiting for PostgreSQL health check..."
WAIT_COUNT=0
while true; do
  PG_STATUS="$(docker inspect -f '{{.State.Health.Status}}' touqi-postgres 2>/dev/null || true)"
  if [ "$PG_STATUS" = "healthy" ]; then
    break
  fi

  WAIT_COUNT=$((WAIT_COUNT + 1))
  if [ "$WAIT_COUNT" -ge 30 ]; then
    echo "[ERROR] PostgreSQL did not become healthy in time."
    exit 1
  fi
  sleep 2
done

echo
echo "[2/4] Building backend image..."
docker compose build backend

echo
echo "Checking whether PostgreSQL already contains user data..."
USER_COUNT="$(docker compose run --rm backend python -c "from sqlalchemy import create_engine, inspect, text; import os; engine = create_engine(os.environ['DATABASE_URL']); inspector = inspect(engine); conn = engine.connect(); value = conn.execute(text(\"SELECT COUNT(*) FROM users\")).scalar() if inspector.has_table('users') else 0; conn.close(); print(value)" 2>/dev/null || true)"
if [ -z "$USER_COUNT" ]; then
  echo "[ERROR] Could not connect to PostgreSQL or query the users table."
  exit 1
fi

if [ "$USER_COUNT" != "0" ]; then
  echo "[INFO] PostgreSQL users table already has $USER_COUNT rows."
  echo "Migration has been stopped to avoid overwriting existing data."
  echo "Backup file: $BACKUP_FILE"
  exit 1
fi

echo
echo "[3/4] Running migration..."
echo "Target tables will be truncated first to clear seeded rows such as announcements."
docker compose run --rm backend python scripts/migrate_sqlite_to_postgres.py --source /app/data/touqi.db --truncate

echo
echo "[4/4] Validating migrated data..."
PG_USER_COUNT="$(docker compose run --rm backend python -c "from sqlalchemy import create_engine, text; import os; engine = create_engine(os.environ['DATABASE_URL']); conn = engine.connect(); value = conn.execute(text(\"SELECT COUNT(*) FROM users\")).scalar(); conn.close(); print(value)" 2>/dev/null || true)"
if [ -z "$PG_USER_COUNT" ]; then
  echo "[ERROR] Validation query failed after migration."
  echo "Backup file: $BACKUP_FILE"
  exit 1
fi
if [ "$PG_USER_COUNT" = "0" ]; then
  echo "[ERROR] Migration finished but PostgreSQL still has zero users."
  echo "Backup file: $BACKUP_FILE"
  exit 1
fi

echo
echo "Migration completed successfully."
echo "SQLite backup: $BACKUP_FILE"
echo "PostgreSQL users: $PG_USER_COUNT"
echo "Next step: docker compose up -d --build"
