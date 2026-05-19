## SQLite To PostgreSQL

This project now defaults to PostgreSQL in `docker-compose.yml`. If you already have data in `./data/touqi.db`, migrate it before switching traffic.

### Fastest Way With Docker

Windows:

Use the repo-root script:

```powershell
docker_migrate_sqlite_to_postgres.bat
```

Linux:

```bash
chmod +x docker_migrate_sqlite_to_postgres.sh
./docker_migrate_sqlite_to_postgres.sh
```

The script will:

1. Start PostgreSQL
2. Build the backend image
3. Import `data\touqi.db` inside the backend container
4. Back up the original SQLite file before importing
5. Stop safely if PostgreSQL already contains data

After migration, start the stack normally:

```powershell
docker compose up -d --build
```

### Manual Way

### Notes

- The script preserves primary key IDs.
- PostgreSQL sequences are reset after import.
- The script copies only columns that exist in the SQLite source, so it tolerates older SQLite schemas.
- Back up `./data/touqi.db` before running the migration.
