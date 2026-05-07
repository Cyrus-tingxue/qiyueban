import os
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

# Set echo based on env variable, default to False for production performance
echo_sql = os.getenv("SQLALCHEMY_ECHO", "False").lower() in ("true", "1", "t")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
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
    
    # 因为使用 SQLite 且没有完整应用 Alembic，手工加上新字段（防止 drop 表丢失数据）
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE replies ADD COLUMN reply_to_id INTEGER REFERENCES replies(id)"))
            conn.execute(text("ALTER TABLE replies ADD COLUMN reply_to_user_id INTEGER REFERENCES users(id)"))
            conn.execute(text("ALTER TABLE replies ADD COLUMN reply_to_username VARCHAR(50)"))
    except Exception:
        pass

    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
    except Exception:
        pass

    for statement in (
        "ALTER TABLE users ADD COLUMN email VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0",
        "ALTER TABLE users ADD COLUMN pending_email VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN email_verification_code_hash VARCHAR(128)",
        "ALTER TABLE users ADD COLUMN email_verification_expires_at DATETIME",
        "ALTER TABLE users ADD COLUMN password_reset_token_hash VARCHAR(128)",
        "ALTER TABLE users ADD COLUMN password_reset_expires_at DATETIME",
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

    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE replies ADD COLUMN image_url VARCHAR(500)"))
    except Exception:
        pass

    Base.metadata.create_all(bind=engine)
