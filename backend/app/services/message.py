from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func
from ..models.message import Message
from ..models.user import User
from ..schemas.message import MessageCreate, ConversationResponse
from fastapi import HTTPException, status

def send_message(db: Session, sender_id: int, message_in: MessageCreate):
    receiver = db.query(User).filter(User.id == message_in.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receiver not found")
        
    db_message = Message(
        sender_id=sender_id,
        receiver_id=message_in.receiver_id,
        content=message_in.content
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def get_messages_between_users(db: Session, user1_id: int, user2_id: int, skip: int = 0, limit: int = 50):
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == user1_id, Message.receiver_id == user2_id),
            and_(Message.sender_id == user2_id, Message.receiver_id == user1_id)
        )
    ).order_by(Message.created_at.desc()).offset(skip).limit(limit).all()
    # 按照时间从早到晚排序返回，方便前端展示
    return messages[::-1]

def mark_messages_as_read(db: Session, current_user_id: int, sender_id: int):
    # 将此发送者发给当前用户的所有未读消息标记为已读
    unread_messages = db.query(Message).filter(
        Message.receiver_id == current_user_id,
        Message.sender_id == sender_id,
        Message.is_read == False
    ).all()
    
    if unread_messages:
        for msg in unread_messages:
            msg.is_read = True
        db.commit()
    
    return len(unread_messages)

def get_conversations(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    # 此查询比较复杂，需要获取当前用户参与过的所有消息
    # 我们先取所有相关的消息
    messages = db.query(Message).filter(
        or_(Message.sender_id == user_id, Message.receiver_id == user_id)
    ).order_by(Message.created_at.desc()).all()
    
    # 手动在内存中计算会话列表
    conversations = {}
    
    for msg in messages:
        other_user_id = msg.receiver_id if msg.sender_id == user_id else msg.sender_id
        
        if other_user_id not in conversations:
            other_user = msg.receiver if msg.sender_id == user_id else msg.sender
            conversations[other_user_id] = {
                "with_user": other_user,
                "last_message": msg,
                "unread_count": 0
            }
            
        # 如果当前用户是接收者且消息未读，增加未读计数
        if msg.receiver_id == user_id and not msg.is_read:
            conversations[other_user_id]["unread_count"] += 1
            
    # 将字典转换为列表，并按照最后一条消息的时间降序排列
    conv_list = list(conversations.values())
    conv_list.sort(key=lambda x: x["last_message"].created_at, reverse=True)
    
    return conv_list[skip : skip + limit]

def get_total_unread_count(db: Session, user_id: int):
    return db.query(Message).filter(
        Message.receiver_id == user_id,
        Message.is_read == False
    ).count()

def delete_conversation(db: Session, current_user_id: int, other_user_id: int):
    """
    物理删除两个用户之间的所有聊天记录。
    """
    deleted_count = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user_id, Message.receiver_id == other_user_id),
            and_(Message.sender_id == other_user_id, Message.receiver_id == current_user_id)
        )
    ).delete(synchronize_session=False)
    
    db.commit()
    return deleted_count
