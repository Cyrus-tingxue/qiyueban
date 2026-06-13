from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from ..database import Base


class IpBan(Base):
    __tablename__ = "ip_bans"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ip_address = Column(String(64), unique=True, nullable=False, index=True)
    reason = Column(String(500), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
