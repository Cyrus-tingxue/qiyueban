from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MessageBase(BaseModel):
    content: str
    receiver_id: int

class MessageCreate(MessageBase):
    pass

class UserBasicInfo(BaseModel):
    uid: int
    username: str
    nickname: str
    avatar: Optional[str] = None
    
    class Config:
        orm_mode = True

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    created_at: str
    
    sender: UserBasicInfo
    receiver: UserBasicInfo

    class Config:
        orm_mode = True

class ConversationResponse(BaseModel):
    with_user: UserBasicInfo
    last_message: MessageResponse
    unread_count: int
