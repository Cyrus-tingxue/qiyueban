from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime, timezone
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    nickname = Column(String(50), nullable=False)
    password_hash = Column(String(128), nullable=False)
    email = Column(String(255), unique=True, nullable=True, index=True)
    email_verified = Column(Boolean, default=False)
    pending_email = Column(String(255), nullable=True)
    email_verification_code_hash = Column(String(128), nullable=True)
    email_verification_expires_at = Column(DateTime, nullable=True)
    password_reset_token_hash = Column(String(128), nullable=True)
    password_reset_expires_at = Column(DateTime, nullable=True)
    avatar = Column(String(255), default="")
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
