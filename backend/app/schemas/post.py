from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PostCreate(BaseModel):
    title: str
    content: str
    category: str
    image_url: Optional[str] = None


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    image_url: Optional[str] = None
    category: str
    author: str
    author_id: int
    author_avatar: str = ""
    reply_count: int
    like_count: int = 0
    is_liked: bool = False
    created_at: str

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    items: List[PostResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CategoryResponse(BaseModel):
    id: int
    name: str
    icon: str

    class Config:
        from_attributes = True


class ReplyCreate(BaseModel):
    content: str
    image_url: Optional[str] = None
    reply_to_id: Optional[int] = None
    reply_to_user_id: Optional[int] = None
    reply_to_username: Optional[str] = None


class ReplyResponse(BaseModel):
    id: int
    content: str
    image_url: Optional[str] = None
    author: str
    author_id: int
    author_avatar: str = ""
    like_count: int = 0
    is_liked: bool = False
    reply_to_id: Optional[int] = None
    reply_to_user_id: Optional[int] = None
    reply_to_username: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True
