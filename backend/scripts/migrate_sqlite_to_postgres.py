import argparse
import os
import sqlite3
import sys
from pathlib import Path

from sqlalchemy import MetaData, create_engine, inspect, text


CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = CURRENT_DIR.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import Base, apply_postgres_column_expansions  # noqa: E402
from app.models import (  # noqa: E402,F401
    Announcement,
    Category,
    ChatGroup,
    ChatGroupInvite,
    ChatGroupMember,
    Friendship,
    GroupMessage,
    Like,
    Message,
    Notification,
    Post,
    Reply,
    ReplyLike,
    User,
)


TABLE_ORDER = [
    "announcements",
    "users",
    "categories",
    "posts",
    "replies",
    "likes",
    "reply_likes",
    "notifications",
    "friendships",
    "chat_groups",
    "messages",
    "group_messages",
    "chat_group_members",
    "chat_group_invites",
]

PLACEHOLDER_PASSWORD_HASH = "migrated-placeholder"


USER_REFERENCE_SOURCES = (
    ("posts", "author_id"),
    ("replies", "author_id"),
    ("messages", "sender_id"),
    ("messages", "receiver_id"),
    ("notifications", "receiver_id"),
    ("notifications", "sender_id"),
    ("chat_groups", "creator_id"),
    ("group_messages", "sender_id"),
    ("chat_group_members", "user_id"),
    ("chat_group_members", "invited_by_id"),
    ("chat_group_invites", "inviter_id"),
    ("chat_group_invites", "invitee_id"),
    ("friendships", "requester_id"),
    ("friendships", "addressee_id"),
)


def parse_args():
    parser = argparse.ArgumentParser(description="Migrate Touqi data from SQLite to PostgreSQL.")
    parser.add_argument(
        "--source",
        default=os.getenv("SQLITE_MIGRATION_SOURCE", str((BACKEND_ROOT.parent / "data" / "touqi.db").resolve())),
        help="Path to the source SQLite database file.",
    )
    parser.add_argument(
        "--target",
        default=os.getenv("POSTGRES_MIGRATION_URL") or os.getenv("DATABASE_URL"),
        help="Target PostgreSQL SQLAlchemy URL.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Rows inserted per batch.",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Clear target tables before importing.",
    )
    return parser.parse_args()


def get_existing_sqlite_columns(conn: sqlite3.Connection, table_name: str) -> list[str]:
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return [row[1] for row in rows]


def load_sqlite_rows(conn: sqlite3.Connection, table_name: str, selected_columns: list[str]) -> list[dict]:
    if not selected_columns:
        return []

    quoted_columns = ", ".join(f'"{column}"' for column in selected_columns)
    rows = conn.execute(f'SELECT {quoted_columns} FROM "{table_name}" ORDER BY id ASC').fetchall()
    return [dict(row) for row in rows]


def collect_missing_user_ids(conn: sqlite3.Connection, existing_user_ids: set[int]) -> list[int]:
    missing_ids: set[int] = set()
    for table_name, column_name in USER_REFERENCE_SOURCES:
        rows = conn.execute(
            f'''
            SELECT DISTINCT "{column_name}"
            FROM "{table_name}"
            WHERE "{column_name}" IS NOT NULL
              AND "{column_name}" NOT IN (SELECT id FROM users)
            '''
        ).fetchall()
        missing_ids.update(int(row[0]) for row in rows if row[0] is not None and int(row[0]) not in existing_user_ids)
    return sorted(missing_ids)


def build_placeholder_user_rows(selected_columns: list[str], missing_user_ids: list[int]) -> list[dict]:
    rows: list[dict] = []
    for user_id in missing_user_ids:
        base_row = {
            "id": user_id,
            "username": f"migrated_user_{user_id}",
            "nickname": f"Migrated User {user_id}",
            "password_hash": PLACEHOLDER_PASSWORD_HASH,
            "email": None,
            "email_verified": False,
            "pending_email": None,
            "email_verification_code_hash": None,
            "email_verification_expires_at": None,
            "password_reset_token_hash": None,
            "password_reset_expires_at": None,
            "avatar": "eye",
            "is_admin": False,
            "created_at": None,
            "last_seen_at": None,
        }
        rows.append({column: base_row.get(column) for column in selected_columns})
    return rows


def get_existing_ids(conn: sqlite3.Connection, table_name: str) -> set[int]:
    rows = conn.execute(f'SELECT id FROM "{table_name}"').fetchall()
    return {int(row[0]) for row in rows if row[0] is not None}


def normalize_rows_for_foreign_keys(
    table_name: str,
    rows: list[dict],
    *,
    valid_post_ids: set[int],
    valid_reply_ids: set[int],
) -> tuple[list[dict], int]:
    skipped = 0

    if table_name == "replies":
        normalized_rows = []
        for row in rows:
            post_id = row.get("post_id")
            if post_id not in valid_post_ids:
                skipped += 1
                continue
            reply_to_id = row.get("reply_to_id")
            if reply_to_id is not None and reply_to_id not in valid_reply_ids:
                row = dict(row)
                row["reply_to_id"] = None
                row["reply_to_user_id"] = None
                row["reply_to_username"] = None
            normalized_rows.append(row)
        return normalized_rows, skipped

    if table_name == "likes":
        normalized_rows = [row for row in rows if row.get("post_id") in valid_post_ids]
        skipped = len(rows) - len(normalized_rows)
        return normalized_rows, skipped

    if table_name == "notifications":
        normalized_rows = []
        for row in rows:
            post_id = row.get("post_id")
            if post_id is not None and post_id not in valid_post_ids:
                row = dict(row)
                row["post_id"] = None
            normalized_rows.append(row)
        return normalized_rows, skipped

    if table_name == "reply_likes":
        normalized_rows = [row for row in rows if row.get("reply_id") in valid_reply_ids]
        skipped = len(rows) - len(normalized_rows)
        return normalized_rows, skipped

    return rows, skipped


def ensure_target_is_postgres(target_url: str):
    if not target_url:
        raise SystemExit("Missing target PostgreSQL URL. Pass --target or set POSTGRES_MIGRATION_URL.")
    if not target_url.startswith("postgresql"):
        raise SystemExit(f"Target must be PostgreSQL, got: {target_url}")


def ensure_source_exists(source_path: Path):
    if not source_path.exists():
        raise SystemExit(f"SQLite source file not found: {source_path}")


def validate_target_emptiness(engine, table_names: list[str]):
    with engine.connect() as conn:
        for table_name in table_names:
            count = conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar_one()
            if count > 0:
                raise SystemExit(
                    f'Target table "{table_name}" already contains data ({count} rows). '
                    "Re-run with --truncate if you want to overwrite it."
                )


def truncate_target_tables(engine, table_names: list[str]):
    reverse_tables = ", ".join(f'"{table_name}"' for table_name in reversed(table_names))
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE TABLE {reverse_tables} RESTART IDENTITY CASCADE"))


def reset_postgres_sequences(engine, metadata: MetaData):
    with engine.begin() as conn:
        for table_name in TABLE_ORDER:
            table = metadata.tables[table_name]
            if "id" not in table.c:
                continue
            conn.execute(
                text(
                    """
                    SELECT setval(
                        pg_get_serial_sequence(:table_name, 'id'),
                        COALESCE((SELECT MAX(id) FROM {table}), 1),
                        COALESCE((SELECT MAX(id) FROM {table}) IS NOT NULL, false)
                    )
                    """.replace("{table}", f'"{table_name}"')
                ),
                {"table_name": table_name},
            )


def migrate():
    args = parse_args()
    source_path = Path(args.source).resolve()
    ensure_source_exists(source_path)
    ensure_target_is_postgres(args.target)

    print(f"[1/5] Opening SQLite source: {source_path}")
    sqlite_conn = sqlite3.connect(source_path)
    sqlite_conn.row_factory = sqlite3.Row

    print("[2/5] Preparing PostgreSQL schema")
    target_engine = create_engine(args.target, future=True)
    Base.metadata.create_all(bind=target_engine)
    apply_postgres_column_expansions(target_engine)

    target_metadata = MetaData()
    target_metadata.reflect(bind=target_engine)
    inspector = inspect(target_engine)
    target_tables = [name for name in TABLE_ORDER if name in target_metadata.tables]

    if args.truncate:
        print("[3/5] Truncating target tables")
        truncate_target_tables(target_engine, target_tables)
    else:
        print("[3/5] Verifying target tables are empty")
        validate_target_emptiness(target_engine, target_tables)

    print("[4/5] Copying data")
    valid_post_ids = get_existing_ids(sqlite_conn, "posts")
    valid_reply_ids = {
        int(row["id"])
        for row in load_sqlite_rows(sqlite_conn, "replies", ["id", "post_id"])
        if row.get("post_id") in valid_post_ids
    }
    with target_engine.begin() as conn:
        for table_name in target_tables:
            sqlite_columns = set(get_existing_sqlite_columns(sqlite_conn, table_name))
            target_columns = [column["name"] for column in inspector.get_columns(table_name)]
            selected_columns = [column for column in target_columns if column in sqlite_columns]
            rows = load_sqlite_rows(sqlite_conn, table_name, selected_columns)

            if table_name == "users":
                existing_user_ids = {int(row["id"]) for row in rows if row.get("id") is not None}
                missing_user_ids = collect_missing_user_ids(sqlite_conn, existing_user_ids)
                if missing_user_ids:
                    placeholder_rows = build_placeholder_user_rows(selected_columns, missing_user_ids)
                    rows.extend(placeholder_rows)
                    print(f"  - users: added {len(missing_user_ids)} placeholder rows for orphan references")

            rows, skipped_rows = normalize_rows_for_foreign_keys(
                table_name,
                rows,
                valid_post_ids=valid_post_ids,
                valid_reply_ids=valid_reply_ids,
            )
            if skipped_rows:
                print(f"  - {table_name}: skipped {skipped_rows} orphan rows")

            if not rows:
                print(f"  - {table_name}: 0 rows")
                continue

            table = target_metadata.tables[table_name]
            for start in range(0, len(rows), args.batch_size):
                batch = rows[start:start + args.batch_size]
                conn.execute(table.insert(), batch)

            print(f"  - {table_name}: {len(rows)} rows")

    print("[5/5] Resetting PostgreSQL sequences")
    reset_postgres_sequences(target_engine, target_metadata)
    sqlite_conn.close()
    print("Migration completed successfully.")


if __name__ == "__main__":
    migrate()
