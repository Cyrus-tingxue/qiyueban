from typing import List, Optional

from pydantic import BaseModel


class UserBasicInfo(BaseModel):
    uid: int
    username: str
    nickname: str
    avatar: Optional[str] = None
    is_online: Optional[bool] = None
    last_seen_at: Optional[str] = None

    class Config:
        from_attributes = True


class MessageBase(BaseModel):
    content: str


class MessageCreate(MessageBase):
    receiver_id: int


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
        from_attributes = True


class ConversationResponse(BaseModel):
    with_user: UserBasicInfo
    last_message: MessageResponse
    unread_count: int


class FriendRequestCreate(BaseModel):
    user_id: int


class FriendRequestResponse(BaseModel):
    id: int
    status: str
    created_at: str
    requester: UserBasicInfo
    addressee: UserBasicInfo
    direction: str


class FriendListItem(BaseModel):
    friend: UserBasicInfo
    friendship_id: int
    since: str


class GroupCreate(BaseModel):
    name: str
    member_ids: List[int] = []
    is_public: bool = True


class GroupMemberAdd(BaseModel):
    user_id: int


class GroupInviteResponse(BaseModel):
    id: int
    status: str
    created_at: str
    group_id: int
    group_name: str
    inviter: UserBasicInfo
    invitee: UserBasicInfo


class GroupMessageCreate(MessageBase):
    pass


class GroupMessageResponse(BaseModel):
    id: int
    group_id: int
    content: str
    created_at: str
    sender: UserBasicInfo
    sender_id: int


class GroupSummaryResponse(BaseModel):
    id: int
    name: str
    is_public: bool
    member_count: int
    is_member: bool
    unread_count: int = 0
    created_at: str
    creator: UserBasicInfo
    last_message: Optional[GroupMessageResponse] = None


class GroupDetailResponse(GroupSummaryResponse):
    members: List[UserBasicInfo]
