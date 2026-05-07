from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
import zoneinfo
from datetime import timezone

from ..database import get_db
from ..models.user import User
from ..schemas.message import MessageCreate, MessageResponse, ConversationResponse
from ..services.message import (
    send_message, 
    get_messages_between_users, 
    mark_messages_as_read, 
    get_conversations,
    get_total_unread_count,
    delete_conversation
)
from ..dependencies import get_current_user

shanghai_tz = zoneinfo.ZoneInfo("Asia/Shanghai")

def format_msg_datetime(dt):
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(shanghai_tz).strftime("%Y-%m-%d %H:%M")

def format_user(user):
    """将 ORM User 对象转为 dict，id 映射为 uid"""
    if user is None:
        return {"uid": 0, "username": "deleted", "nickname": "已删除用户", "avatar": "eye"}
    return {
        "uid": user.id,
        "username": user.username,
        "nickname": user.nickname,
        "avatar": user.avatar or "eye",
    }

def format_message(msg):
    """将 ORM Message 对象转为 dict，格式化 created_at"""
    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "content": msg.content,
        "is_read": msg.is_read,
        "created_at": format_msg_datetime(msg.created_at),
        "sender": format_user(msg.sender),
        "receiver": format_user(msg.receiver),
    }

router = APIRouter(
    prefix="/messages",
    tags=["messages"]
)

@router.post("")
def api_send_message(
    message_in: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    发送私信
    """
    msg = send_message(db=db, sender_id=current_user.id, message_in=message_in)
    return format_message(msg)

@router.get("/unread/count", response_model=dict)
def api_get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取总未读消息数量 (可用于导航栏角标)
    """
    count = get_total_unread_count(db=db, user_id=current_user.id)
    return {"unread_count": count}

@router.get("/conversations")
def api_get_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取当前用户的最近回话列表
    """
    convs = get_conversations(db=db, user_id=current_user.id, skip=skip, limit=limit)
    for conv in convs:
        conv["with_user"] = format_user(conv["with_user"])
        conv["last_message"] = format_message(conv["last_message"])
    return convs

@router.get("/{other_user_id}")
def api_get_messages(
    other_user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取与指定用户的私信历史记录，顺便标记为已读
    """
    mark_messages_as_read(db=db, current_user_id=current_user.id, sender_id=other_user_id)
    messages = get_messages_between_users(
        db=db, 
        user1_id=current_user.id, 
        user2_id=other_user_id, 
        skip=skip, 
        limit=limit
    )
    return [format_message(m) for m in messages]

@router.post("/{other_user_id}/read", response_model=dict)
def api_mark_as_read(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    手动将与某个用户的未读消息设为已读
    """
    count = mark_messages_as_read(db=db, current_user_id=current_user.id, sender_id=other_user_id)
    return {"status": "success", "marked_read_count": count}

@router.delete("/{other_user_id}", response_model=dict)
def api_delete_conversation(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    删除与指定用户的全部聊天会话记录 (物理删除)
    """
    deleted_count = delete_conversation(db=db, current_user_id=current_user.id, other_user_id=other_user_id)
    return {"status": "success", "deleted_count": deleted_count}
