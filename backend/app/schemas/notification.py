from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class NotificationResponse(BaseModel):
    id: int
    sender_id: Optional[int]
    sender_name: Optional[str]
    sender_avatar: str = ""
    type: str
    target_id: Optional[int]
    post_id: Optional[int]
    is_read: bool
    created_at: str

    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    unread_count: int
