import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def _resolve_database_url() -> str:
    raw_url = os.getenv("DATABASE_URL", "sqlite:///./data/touqi.db")
    if not raw_url.startswith("sqlite:///"):
        return raw_url

    raw_path = raw_url.replace("sqlite:///", "", 1)
    if raw_path == ":memory:":
        return raw_url

    config_path = Path(__file__).resolve()
    backend_root = config_path.parents[1]
    project_root = config_path.parents[2] if len(config_path.parents) > 2 else backend_root
    data_root = project_root / "data"
    if not data_root.exists():
        data_root = backend_root / "data"

    db_path = Path(raw_path)
    if not db_path.is_absolute():
        normalized = raw_path.replace("\\", "/").lstrip("./")
        if normalized == "touqi.db" and (data_root / "touqi.db").exists():
            db_path = data_root / "touqi.db"
        elif normalized.startswith("data/"):
            db_path = project_root / normalized if (project_root / "data").exists() else backend_root / normalized
        else:
            db_path = Path.cwd() / db_path

    db_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{db_path.resolve().as_posix()}"


# 数据库
DATABASE_URL = _resolve_database_url()

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "touqi-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost").split(",")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost")

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM") or SMTP_USERNAME or "no-reply@touqi.local"
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

