@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

echo ==========================================
echo Docker migration: SQLite to PostgreSQL
echo ==========================================
echo.
echo This script will:
echo 1. Start the postgres container
echo 2. Build the backend image
echo 3. Run the migration script inside the backend container
echo 4. Run a basic validation step
echo.

set "SQLITE_FILE=%~dp0data\touqi.db"
if not exist "%SQLITE_FILE%" (
    echo [ERROR] SQLite database not found:
    echo %SQLITE_FILE%
    echo.
    pause
    exit /b 1
)

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "STAMP=%%i"
set "BACKUP_FILE=%~dp0data\qiyueban.db"

echo [0/4] Backing up SQLite database...
copy /y "%SQLITE_FILE%" "%BACKUP_FILE%" >nul
if errorlevel 1 (
    echo [ERROR] Failed to create SQLite backup.
    pause
    exit /b 1
)

echo [1/4] Starting PostgreSQL...
docker compose up -d postgres
if errorlevel 1 (
    echo [ERROR] Failed to start postgres.
    pause
    exit /b 1
)

echo Waiting for PostgreSQL health check...
set /a WAIT_COUNT=0
:wait_pg
set "PG_STATUS="
for /f "delims=" %%i in ('docker inspect -f "{{.State.Health.Status}}" touqi-postgres 2^>nul') do set "PG_STATUS=%%i"
if /i "!PG_STATUS!"=="healthy" goto pg_ready
set /a WAIT_COUNT+=1
if !WAIT_COUNT! GEQ 30 (
    echo [ERROR] PostgreSQL did not become healthy in time.
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
goto wait_pg

:pg_ready
echo.
echo [2/4] Building backend image...
docker compose build backend
if errorlevel 1 (
    echo [ERROR] Failed to build backend image.
    pause
    exit /b 1
)

echo.
echo Checking whether PostgreSQL already contains user data...
set "USER_COUNT="
for /f %%i in ('docker compose run --rm backend python -c "from sqlalchemy import create_engine, text; import os; engine = create_engine(os.environ['DATABASE_URL']); conn = engine.connect(); value = conn.execute(text(\"SELECT COUNT(*) FROM users\")).scalar(); conn.close(); print(value)" 2^>nul') do set "USER_COUNT=%%i"
if not defined USER_COUNT (
    echo [ERROR] Could not connect to PostgreSQL or query the users table.
    pause
    exit /b 1
)

if not "!USER_COUNT!"=="0" (
    echo [INFO] PostgreSQL users table already has !USER_COUNT! rows.
    echo Migration has been stopped to avoid overwriting existing data.
    echo Backup file: %BACKUP_FILE%
    echo.
    pause
    exit /b 1
)

echo.
echo [3/4] Running migration...
echo Target tables will be truncated first to clear seeded rows such as announcements.
docker compose run --rm backend python scripts/migrate_sqlite_to_postgres.py --source /app/data/touqi.db --truncate
if errorlevel 1 (
    echo [ERROR] Data migration failed.
    pause
    exit /b 1
)

echo.
echo [4/4] Validating migrated data...
set "PG_USER_COUNT="
for /f %%i in ('docker compose run --rm backend python -c "from sqlalchemy import create_engine, text; import os; engine = create_engine(os.environ['DATABASE_URL']); conn = engine.connect(); value = conn.execute(text(\"SELECT COUNT(*) FROM users\")).scalar(); conn.close(); print(value)" 2^>nul') do set "PG_USER_COUNT=%%i"
if not defined PG_USER_COUNT (
    echo [ERROR] Validation query failed after migration.
    echo Backup file: %BACKUP_FILE%
    pause
    exit /b 1
)
if "!PG_USER_COUNT!"=="0" (
    echo [ERROR] Migration finished but PostgreSQL still has zero users.
    echo Backup file: %BACKUP_FILE%
    pause
    exit /b 1
)

echo.
echo Migration completed successfully.
echo SQLite backup: %BACKUP_FILE%
echo PostgreSQL users: !PG_USER_COUNT!
echo Next step: docker compose up -d --build
echo.
pause
