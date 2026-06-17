import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

# Set echo based on env variable, default to False for production performance
echo_sql = os.getenv("SQLALCHEMY_ECHO", "False").lower() in ("true", "1", "t")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=10 if "sqlite" not in DATABASE_URL else 5,
    max_overflow=20 if "sqlite" not in DATABASE_URL else 10,
    echo=echo_sql,
)

# Enable WAL mode and robust synchronous settings for SQLite to improve concurrency
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()



# Enable WAL mode and robust synchronous settings for SQLite to improve concurrency
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI 依赖：获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """创建所有表"""
    from . import models  # noqa: F401
    
    # 兼容 SQLite 和 PostgreSQL
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE replies ADD COLUMN reply_to_id INTEGER REFERENCES replies(id)"))
            conn.execute(text("ALTER TABLE replies ADD COLUMN reply_to_user_id INTEGER REFERENCES users(id)"))
            conn.execute(text("ALTER TABLE replies ADD COLUMN reply_to_username VARCHAR(255)"))
    except Exception:
        pass

    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))
    except Exception:
        pass

    for statement in (
        "ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN banned_reason VARCHAR(500)",
        "ALTER TABLE users ADD COLUMN email VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN pending_email VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN email_verification_code_hash VARCHAR(128)",
        "ALTER TABLE users ADD COLUMN email_verification_expires_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN password_reset_token_hash VARCHAR(128)",
        "ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users(email)",
    ):
        try:
            with engine.begin() as conn:
                conn.execute(text(statement))
        except Exception:
            pass

    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE posts ADD COLUMN image_url VARCHAR(500)"))
    except Exception:
        pass

    for statement in (
        "ALTER TABLE posts ADD COLUMN is_grave BOOLEAN DEFAULT FALSE",
        "ALTER TABLE posts ADD COLUMN grave_at TIMESTAMP",
        "ALTER TABLE posts ADD COLUMN grave_by_id INTEGER REFERENCES users(id)",
        "CREATE INDEX IF NOT EXISTS ix_posts_is_grave ON posts(is_grave)",
    ):
        try:
            with engine.begin() as conn:
                conn.execute(text(statement))
        except Exception:
            pass

    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE replies ADD COLUMN image_url VARCHAR(500)"))
    except Exception:
        pass

    for statement in (
        "ALTER TABLE messages ADD COLUMN sender_deleted_at TIMESTAMP",
        "ALTER TABLE messages ADD COLUMN receiver_deleted_at TIMESTAMP",
        "CREATE INDEX IF NOT EXISTS ix_messages_sender_deleted_at ON messages(sender_deleted_at)",
        "CREATE INDEX IF NOT EXISTS ix_messages_receiver_deleted_at ON messages(receiver_deleted_at)",
    ):
        try:
            with engine.begin() as conn:
                conn.execute(text(statement))
        except Exception:
            pass

    for statement in (
        "ALTER TABLE chat_group_members ADD COLUMN last_read_message_id INTEGER REFERENCES group_messages(id)",
        """
        UPDATE chat_group_members
        SET last_read_message_id = (
            SELECT MAX(group_messages.id)
            FROM group_messages
            WHERE group_messages.group_id = chat_group_members.group_id
        )
        WHERE last_read_message_id IS NULL
        """,
        "CREATE INDEX IF NOT EXISTS ix_chat_group_members_last_read_message_id ON chat_group_members(last_read_message_id)",
    ):
        try:
            with engine.begin() as conn:
                conn.execute(text(statement))
        except Exception:
            pass

    for statement in (
        "CREATE INDEX IF NOT EXISTS ix_notifications_type_target_receiver ON notifications(type, target_id, receiver_id)",
        "CREATE INDEX IF NOT EXISTS ix_notifications_receiver_created_at ON notifications(receiver_id, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_notifications_receiver_is_read ON notifications(receiver_id, is_read)",
        "CREATE INDEX IF NOT EXISTS ix_messages_sender_receiver_created_at ON messages(sender_id, receiver_id, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_messages_receiver_sender_id ON messages(receiver_id, sender_id, id)",
        "CREATE INDEX IF NOT EXISTS ix_messages_receiver_sender_read_deleted ON messages(receiver_id, sender_id, is_read, receiver_deleted_at)",
        "CREATE INDEX IF NOT EXISTS ix_group_messages_group_created_at ON group_messages(group_id, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_group_messages_group_id_id ON group_messages(group_id, id)",
        "CREATE INDEX IF NOT EXISTS ix_chat_group_members_group_user ON chat_group_members(group_id, user_id)",
        "CREATE INDEX IF NOT EXISTS ix_chat_group_members_user_group ON chat_group_members(user_id, group_id)",
        "CREATE INDEX IF NOT EXISTS ix_group_invites_invitee_status_created_at ON chat_group_invites(invitee_id, status, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_posts_author_created_at ON posts(author_id, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_posts_category_created_at ON posts(category, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_replies_post_created_at ON replies(post_id, created_at)",
    ):
        try:
            with engine.begin() as conn:
                conn.execute(text(statement))
        except Exception:
            pass

    Base.metadata.create_all(bind=engine)
    apply_postgres_column_expansions(engine)


def apply_postgres_column_expansions(target_engine):
    if not str(target_engine.url).startswith("postgresql"):
        return

    statements = (
        'ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(255)',
        'ALTER TABLE users ALTER COLUMN nickname TYPE VARCHAR(255)',
        'ALTER TABLE posts ALTER COLUMN title TYPE VARCHAR(500)',
        'ALTER TABLE posts ALTER COLUMN author_name TYPE VARCHAR(255)',
        'ALTER TABLE replies ALTER COLUMN author_name TYPE VARCHAR(255)',
        'ALTER TABLE replies ALTER COLUMN reply_to_username TYPE VARCHAR(255)',
        'ALTER TABLE notifications ALTER COLUMN sender_name TYPE VARCHAR(255)',
        'ALTER TABLE messages ALTER COLUMN content TYPE TEXT',
        'ALTER TABLE group_messages ALTER COLUMN content TYPE TEXT',
    )
    for statement in statements:
        try:
            with target_engine.begin() as conn:
                conn.execute(text(statement))
        except Exception:
            pass
