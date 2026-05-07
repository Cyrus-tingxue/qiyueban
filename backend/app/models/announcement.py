from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, Text

from ..database import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    content = Column(Text, nullable=False, default="")
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
