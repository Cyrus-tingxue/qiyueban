from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from datetime import datetime, timezone
from ..database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sender_name = Column(String(50), nullable=True)
    sender_avatar = Column(String(255), default="")
    type = Column(String(20), nullable=False)  # 'reply', 'mention'
    target_id = Column(Integer, nullable=True) # 回复ID或其它目标的ID
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True) # 属于哪篇帖子
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
