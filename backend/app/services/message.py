from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from ..models.chat_group import ChatGroup, ChatGroupMember
from ..models.friendship import Friendship
from ..models.group_invite import ChatGroupInvite
from ..models.group_message import GroupMessage
from ..models.message import Message
from ..models.notification import Notification
from ..models.user import User

ONLINE_WINDOW_SECONDS = 45


def _utcnow():
    return datetime.now(timezone.utc)


def is_user_online(user: User) -> bool:
    if not user or not user.last_seen_at:
        return False

    last_seen = user.last_seen_at
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)

    return (_utcnow() - last_seen).total_seconds() <= ONLINE_WINDOW_SECONDS


def _friendship_pair(user1_id: int, user2_id: int):
    return (min(user1_id, user2_id), max(user1_id, user2_id))


def _visibility_filter_for_user(current_user_id: int):
    return or_(
        and_(Message.sender_id == current_user_id, Message.sender_deleted_at.is_(None)),
        and_(Message.receiver_id == current_user_id, Message.receiver_deleted_at.is_(None)),
    )


def _get_friendship_between(db: Session, user1_id: int, user2_id: int):
    return db.query(Friendship).filter(
        or_(
            and_(Friendship.requester_id == user1_id, Friendship.addressee_id == user2_id),
            and_(Friendship.requester_id == user2_id, Friendship.addressee_id == user1_id),
        )
    ).first()


def _create_notification(
    db: Session,
    *,
    receiver_id: int,
    sender_id: int | None,
    sender_name: str | None,
    notif_type: str,
    target_id: int | None = None,
    post_id: int | None = None,
):
    notif = Notification(
        receiver_id=receiver_id,
        sender_id=sender_id,
        sender_name=sender_name,
        type=notif_type,
        target_id=target_id,
        post_id=post_id,
    )
    db.add(notif)
    return notif


def _get_latest_group_message_id(db: Session, group_id: int):
    latest_message = (
        db.query(GroupMessage.id)
        .filter(GroupMessage.group_id == group_id)
        .order_by(GroupMessage.id.desc())
        .first()
    )
    return latest_message[0] if latest_message else None


def list_friends(db: Session, user_id: int):
    return (
        db.query(Friendship)
        .options(joinedload(Friendship.requester), joinedload(Friendship.addressee))
        .filter(
            Friendship.status == "accepted",
            or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id),
        )
        .order_by(Friendship.accepted_at.desc(), Friendship.created_at.desc())
        .all()
    )


def list_friend_requests(db: Session, user_id: int):
    return (
        db.query(Friendship)
        .options(joinedload(Friendship.requester), joinedload(Friendship.addressee))
        .filter(
            Friendship.status == "pending",
            or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id),
        )
        .order_by(Friendship.created_at.desc())
        .all()
    )


def send_friend_request(db: Session, requester_id: int, addressee_id: int):
    if requester_id == addressee_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不能添加自己为好友")

    requester = db.query(User).filter(User.id == requester_id).first()
    addressee = db.query(User).filter(User.id == addressee_id).first()
    if not addressee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    existing = _get_friendship_between(db, requester_id, addressee_id)
    if existing:
        if existing.status == "accepted":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="你们已经是好友了")
        if existing.status == "pending":
            if existing.requester_id != requester_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="对方已向你发来好友申请")

            existing.created_at = _utcnow()
            existing.accepted_at = None
            db.flush()
            record = existing
        else:
            existing.requester_id = requester_id
            existing.addressee_id = addressee_id
            existing.status = "pending"
            existing.created_at = _utcnow()
            existing.accepted_at = None
            db.flush()
            record = existing
    else:
        record = Friendship(
            requester_id=requester_id,
            addressee_id=addressee_id,
            status="pending",
        )
        db.add(record)
        db.flush()

    notification = (
        db.query(Notification)
        .filter(
            Notification.type == "friend_request",
            Notification.target_id == record.id,
            Notification.receiver_id == addressee_id,
        )
        .first()
    )
    if notification:
        notification.sender_id = requester_id
        notification.sender_name = requester.nickname or requester.username if requester else None
        notification.is_read = False
    else:
        _create_notification(
            db,
            receiver_id=addressee_id,
            sender_id=requester_id,
            sender_name=requester.nickname or requester.username if requester else None,
            notif_type="friend_request",
            target_id=record.id,
        )

    db.commit()
    db.refresh(record)
    return record


def respond_to_friend_request(db: Session, request_id: int, current_user_id: int, accept: bool):
    record = (
        db.query(Friendship)
        .options(joinedload(Friendship.requester), joinedload(Friendship.addressee))
        .filter(Friendship.id == request_id, Friendship.status == "pending")
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="好友申请不存在")
    if record.addressee_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权处理该好友申请")

    if accept:
        record.status = "accepted"
        record.accepted_at = _utcnow()
    else:
        record.status = "rejected"
        record.accepted_at = None

    db.query(Notification).filter(
        Notification.type == "friend_request",
        Notification.target_id == request_id,
        Notification.receiver_id == current_user_id,
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    return record


def remove_friend(db: Session, current_user_id: int, friend_user_id: int):
    friendship = (
        db.query(Friendship)
        .filter(
            Friendship.status == "accepted",
            or_(
                and_(Friendship.requester_id == current_user_id, Friendship.addressee_id == friend_user_id),
                and_(Friendship.requester_id == friend_user_id, Friendship.addressee_id == current_user_id),
            ),
        )
        .first()
    )
    if not friendship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="好友关系不存在")

    db.query(Notification).filter(
        Notification.type == "friend_request",
        Notification.target_id == friendship.id,
    ).delete(synchronize_session=False)
    db.delete(friendship)
    db.commit()
    return {"status": "success"}


def send_message(db: Session, sender_id: int, message_in):
    receiver = db.query(User).filter(User.id == message_in.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="接收方不存在")

    friendship = _get_friendship_between(db, sender_id, message_in.receiver_id)
    if not friendship or friendship.status != "accepted":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="你们还不是好友")

    msg = Message(
        sender_id=sender_id,
        receiver_id=message_in.receiver_id,
        content=message_in.content.strip(),
        is_read=False,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_messages_between_users(db: Session, user1_id: int, user2_id: int, skip: int = 0, limit: int = 50):
    return (
        db.query(Message)
        .options(joinedload(Message.sender), joinedload(Message.receiver))
        .filter(
            or_(
                and_(Message.sender_id == user1_id, Message.receiver_id == user2_id),
                and_(Message.sender_id == user2_id, Message.receiver_id == user1_id),
            )
        )
        .filter(_visibility_filter_for_user(user1_id))
        .order_by(Message.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def mark_messages_as_read(db: Session, current_user_id: int, sender_id: int):
    count = (
        db.query(Message)
        .filter(
            Message.receiver_id == current_user_id,
            Message.sender_id == sender_id,
            Message.is_read.is_(False),
            Message.receiver_deleted_at.is_(None),
        )
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return count


def get_total_unread_count(db: Session, user_id: int):
    private_unread_count = (
        db.query(Message)
        .filter(
            Message.receiver_id == user_id,
            Message.is_read.is_(False),
            Message.receiver_deleted_at.is_(None),
        )
        .count()
    )

    memberships = db.query(ChatGroupMember).filter(ChatGroupMember.user_id == user_id).all()
    group_unread_count = 0
    for membership in memberships:
        last_read_message_id = membership.last_read_message_id or 0
        group_unread_count += (
            db.query(GroupMessage)
            .filter(
                GroupMessage.group_id == membership.group_id,
                GroupMessage.id > last_read_message_id,
                GroupMessage.sender_id != user_id,
            )
            .count()
        )

    return private_unread_count + group_unread_count


def get_conversations(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    messages = (
        db.query(Message)
        .options(joinedload(Message.sender), joinedload(Message.receiver))
        .filter(or_(Message.sender_id == user_id, Message.receiver_id == user_id))
        .filter(_visibility_filter_for_user(user_id))
        .order_by(Message.created_at.desc())
        .all()
    )

    conversations = []
    seen = set()
    for msg in messages:
        other_user = msg.receiver if msg.sender_id == user_id else msg.sender
        other_user_id = other_user.id if other_user else None
        if not other_user_id or other_user_id in seen:
            continue
        seen.add(other_user_id)

        unread_count = (
            db.query(Message)
            .filter(
                Message.sender_id == other_user_id,
                Message.receiver_id == user_id,
                Message.is_read.is_(False),
                Message.receiver_deleted_at.is_(None),
            )
            .count()
        )
        conversations.append(
            {
                "with_user": other_user,
                "last_message": msg,
                "unread_count": unread_count,
            }
        )

    return conversations[skip : skip + limit]


def delete_conversation(db: Session, current_user_id: int, other_user_id: int):
    now = _utcnow()

    hidden_count = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == current_user_id, Message.receiver_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.receiver_id == current_user_id),
            ),
            _visibility_filter_for_user(current_user_id),
        )
        .count()
    )

    db.query(Message).filter(
        Message.sender_id == current_user_id,
        Message.receiver_id == other_user_id,
        Message.sender_deleted_at.is_(None),
    ).update({"sender_deleted_at": now}, synchronize_session=False)

    db.query(Message).filter(
        Message.sender_id == other_user_id,
        Message.receiver_id == current_user_id,
        Message.receiver_deleted_at.is_(None),
    ).update({"receiver_deleted_at": now}, synchronize_session=False)

    hard_deleted_count = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == current_user_id, Message.receiver_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.receiver_id == current_user_id),
            ),
            Message.sender_deleted_at.is_not(None),
            Message.receiver_deleted_at.is_not(None),
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"hidden_count": hidden_count, "hard_deleted_count": hard_deleted_count}


def list_groups(db: Session, current_user_id: int):
    groups = db.query(ChatGroup).options(joinedload(ChatGroup.creator)).order_by(ChatGroup.created_at.desc()).all()

    results = []
    for group in groups:
        member_count = db.query(ChatGroupMember).filter(ChatGroupMember.group_id == group.id).count()
        membership = (
            db.query(ChatGroupMember)
            .filter(ChatGroupMember.group_id == group.id, ChatGroupMember.user_id == current_user_id)
            .first()
        )
        is_member = membership is not None
        last_message = (
            db.query(GroupMessage)
            .options(joinedload(GroupMessage.sender))
            .filter(GroupMessage.group_id == group.id)
            .order_by(GroupMessage.created_at.desc())
            .first()
        )
        unread_count = 0
        if membership:
            last_read_message_id = membership.last_read_message_id or 0
            unread_count = (
                db.query(GroupMessage)
                .filter(
                    GroupMessage.group_id == group.id,
                    GroupMessage.id > last_read_message_id,
                    GroupMessage.sender_id != current_user_id,
                )
                .count()
            )
        results.append(
            {
                "group": group,
                "member_count": member_count,
                "is_member": is_member,
                "last_message": last_message,
                "unread_count": unread_count,
            }
        )
    return results


def create_group(db: Session, creator_id: int, payload):
    if not payload.name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="群聊名称不能为空")

    group = ChatGroup(
        name=payload.name.strip(),
        creator_id=creator_id,
        is_public=payload.is_public,
    )
    db.add(group)
    db.flush()

    latest_group_message_id = _get_latest_group_message_id(db, group.id)
    db.add(
        ChatGroupMember(
            group_id=group.id,
            user_id=creator_id,
            invited_by_id=creator_id,
            last_read_message_id=latest_group_message_id,
        )
    )
    for member_id in sorted(set(payload.member_ids or [])):
        if member_id == creator_id:
            continue
        friendship = _get_friendship_between(db, creator_id, member_id)
        if friendship and friendship.status == "accepted":
            exists = db.query(User).filter(User.id == member_id).first()
            if exists:
                db.add(
                    ChatGroupMember(
                        group_id=group.id,
                        user_id=member_id,
                        invited_by_id=creator_id,
                        last_read_message_id=latest_group_message_id,
                    )
                )

    db.commit()
    db.refresh(group)
    return group


def get_group_detail(db: Session, group_id: int, current_user_id: int):
    group = db.query(ChatGroup).options(joinedload(ChatGroup.creator)).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="群聊不存在")

    members = (
        db.query(User)
        .join(ChatGroupMember, ChatGroupMember.user_id == User.id)
        .filter(ChatGroupMember.group_id == group_id)
        .order_by(ChatGroupMember.joined_at.asc())
        .all()
    )
    member_count = len(members)
    membership = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == current_user_id,
    ).first()
    is_member = membership is not None
    last_message = (
        db.query(GroupMessage)
        .options(joinedload(GroupMessage.sender))
        .filter(GroupMessage.group_id == group.id)
        .order_by(GroupMessage.created_at.desc())
        .first()
    )
    unread_count = 0
    if membership:
        last_read_message_id = membership.last_read_message_id or 0
        unread_count = (
            db.query(GroupMessage)
            .filter(
                GroupMessage.group_id == group.id,
                GroupMessage.id > last_read_message_id,
                GroupMessage.sender_id != current_user_id,
            )
            .count()
        )
    return {
        "group": group,
        "members": members,
        "member_count": member_count,
        "is_member": is_member,
        "last_message": last_message,
        "unread_count": unread_count,
    }


def join_group(db: Session, group_id: int, user_id: int):
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="群聊不存在")
    if not group.is_public:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="该群聊不可直接加入")

    existing = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == user_id,
    ).first()
    if existing:
        return group

    db.add(
        ChatGroupMember(
            group_id=group.id,
            user_id=user_id,
            last_read_message_id=_get_latest_group_message_id(db, group.id),
        )
    )
    db.commit()
    db.refresh(group)
    return group


def leave_group(db: Session, group_id: int, user_id: int):
    membership = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == user_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="你不在这个群聊中")

    db.delete(membership)
    db.commit()
    return {"status": "success"}


def add_group_member(db: Session, group_id: int, inviter_id: int, user_id: int):
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="群聊不存在")

    inviter_membership = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == inviter_id,
    ).first()
    if not inviter_membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="你不在这个群聊中")

    friendship = _get_friendship_between(db, inviter_id, user_id)
    if not friendship or friendship.status != "accepted":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="只能邀请好友入群")

    existing = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == user_id,
    ).first()
    if existing:
        return group

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    db.add(
        ChatGroupMember(
            group_id=group.id,
            user_id=user_id,
            invited_by_id=inviter_id,
            last_read_message_id=_get_latest_group_message_id(db, group.id),
        )
    )
    db.commit()
    db.refresh(group)
    return group


def invite_group_member(db: Session, group_id: int, inviter_id: int, user_id: int):
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="缇よ亰涓嶅瓨鍦?")

    inviter_membership = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == inviter_id,
    ).first()
    if not inviter_membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="浣犱笉鍦ㄨ繖涓兢鑱婁腑")

    if inviter_id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="涓嶈兘閭€璇疯嚜宸卞叆缇?")

    existing = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="瀵规柟宸插湪缇ょ粍涓?")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="鐢ㄦ埛涓嶅瓨鍦?")

    existing_invite = db.query(ChatGroupInvite).filter(
        ChatGroupInvite.group_id == group_id,
        ChatGroupInvite.invitee_id == user_id,
        ChatGroupInvite.status == "pending",
    ).first()
    if existing_invite:
        return existing_invite

    invite = ChatGroupInvite(
        group_id=group_id,
        inviter_id=inviter_id,
        invitee_id=user_id,
        status="pending",
    )
    db.add(invite)
    db.flush()

    inviter = db.query(User).filter(User.id == inviter_id).first()
    _create_notification(
        db,
        receiver_id=user_id,
        sender_id=inviter_id,
        sender_name=inviter.nickname or inviter.username if inviter else None,
        notif_type="group_invite",
        target_id=invite.id,
    )
    db.commit()
    db.refresh(invite)
    return invite


def list_group_invites(db: Session, user_id: int):
    return (
        db.query(ChatGroupInvite)
        .options(
            joinedload(ChatGroupInvite.group),
            joinedload(ChatGroupInvite.inviter),
            joinedload(ChatGroupInvite.invitee),
        )
        .filter(
            ChatGroupInvite.invitee_id == user_id,
            ChatGroupInvite.status == "pending",
        )
        .order_by(ChatGroupInvite.created_at.desc())
        .all()
    )


def respond_to_group_invite(db: Session, invite_id: int, current_user_id: int, accept: bool):
    invite = (
        db.query(ChatGroupInvite)
        .options(
            joinedload(ChatGroupInvite.group),
            joinedload(ChatGroupInvite.inviter),
            joinedload(ChatGroupInvite.invitee),
        )
        .filter(
            ChatGroupInvite.id == invite_id,
            ChatGroupInvite.status == "pending",
        )
        .first()
    )
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="缇ゅ姞鍏ラ個璇蜂笉瀛樺湪")
    if invite.invitee_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="鏃犳潈澶勭悊璇ラ個璇?")

    invite.status = "accepted" if accept else "rejected"
    invite.responded_at = _utcnow()

    if accept:
        membership = db.query(ChatGroupMember).filter(
            ChatGroupMember.group_id == invite.group_id,
            ChatGroupMember.user_id == current_user_id,
        ).first()
        if not membership:
            db.add(
                ChatGroupMember(
                    group_id=invite.group_id,
                    user_id=current_user_id,
                    invited_by_id=invite.inviter_id,
                    last_read_message_id=_get_latest_group_message_id(db, invite.group_id),
                )
            )

    db.query(Notification).filter(
        Notification.type == "group_invite",
        Notification.target_id == invite_id,
        Notification.receiver_id == current_user_id,
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    db.refresh(invite)
    return invite


def get_group_messages(db: Session, group_id: int, current_user_id: int, skip: int = 0, limit: int = 100):
    membership = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == current_user_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="你不在这个群聊中")

    messages = (
        db.query(GroupMessage)
        .options(joinedload(GroupMessage.sender))
        .filter(GroupMessage.group_id == group_id)
        .order_by(GroupMessage.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    latest_visible_message = messages[-1] if messages else None
    if latest_visible_message and membership.last_read_message_id != latest_visible_message.id:
        membership.last_read_message_id = latest_visible_message.id
        db.commit()

    return messages


def send_group_message(db: Session, group_id: int, sender_id: int, payload):
    membership = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == sender_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="你不在这个群聊中")

    message = GroupMessage(
        group_id=group_id,
        sender_id=sender_id,
        content=payload.content.strip(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
