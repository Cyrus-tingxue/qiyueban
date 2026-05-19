from datetime import timezone
import zoneinfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.friendship import Friendship
from ..models.group_invite import ChatGroupInvite
from ..models.group_message import GroupMessage
from ..models.message import Message
from ..models.user import User
from ..schemas.message import (
    ConversationResponse,
    FriendRequestCreate,
    GroupCreate,
    GroupInviteResponse,
    GroupMemberAdd,
    GroupMessageCreate,
    MessageCreate,
)
from ..services.message import (
    add_group_member,
    create_group,
    delete_conversation,
    get_conversations,
    get_group_detail,
    get_group_messages,
    get_messages_between_users,
    get_total_unread_count,
    is_user_online,
    join_group,
    leave_group,
    list_group_invites,
    list_friend_requests,
    list_friends,
    list_groups,
    mark_messages_as_read,
    remove_friend,
    invite_group_member,
    respond_to_friend_request,
    respond_to_group_invite,
    send_friend_request,
    send_group_message,
    send_message,
)

shanghai_tz = zoneinfo.ZoneInfo("Asia/Shanghai")
router = APIRouter(prefix="/messages", tags=["messages"])


def format_msg_datetime(dt):
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(shanghai_tz).strftime("%Y-%m-%d %H:%M")


def format_user(user, include_presence: bool = False):
    if user is None:
        return {"uid": 0, "username": "deleted", "nickname": "已删除用户", "avatar": "eye"}
    data = {
        "uid": user.id,
        "username": user.username,
        "nickname": user.nickname,
        "avatar": user.avatar or "eye",
    }
    if include_presence:
        data["is_online"] = is_user_online(user)
        data["last_seen_at"] = format_msg_datetime(user.last_seen_at)
    return data


def format_message(msg: Message):
    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "content": msg.content,
        "is_read": msg.is_read,
        "created_at": format_msg_datetime(msg.created_at),
        "sender": format_user(msg.sender, include_presence=True),
        "receiver": format_user(msg.receiver, include_presence=True),
    }


def format_group_message(msg: GroupMessage):
    return {
        "id": msg.id,
        "group_id": msg.group_id,
        "content": msg.content,
        "created_at": format_msg_datetime(msg.created_at),
        "sender_id": msg.sender_id,
        "sender": format_user(msg.sender, include_presence=True),
    }


def format_friend_request(record: Friendship, current_user_id: int):
    return {
        "id": record.id,
        "status": record.status,
        "created_at": format_msg_datetime(record.created_at),
        "requester": format_user(record.requester, include_presence=True),
        "addressee": format_user(record.addressee, include_presence=True),
        "direction": "incoming" if record.addressee_id == current_user_id else "outgoing",
    }


def format_friendship(record: Friendship, current_user_id: int):
    friend = record.addressee if record.requester_id == current_user_id else record.requester
    return {
        "friend": format_user(friend, include_presence=True),
        "friendship_id": record.id,
        "since": format_msg_datetime(record.accepted_at or record.created_at),
    }


def format_group_summary(group_info, current_user_id: int):
    group = group_info["group"]
    return {
        "id": group.id,
        "name": group.name,
        "is_public": group.is_public,
        "member_count": group_info["member_count"],
        "is_member": group_info["is_member"],
        "unread_count": group_info.get("unread_count", 0),
        "created_at": format_msg_datetime(group.created_at),
        "creator": format_user(group.creator, include_presence=(group.creator_id == current_user_id)),
        "last_message": format_group_message(group_info["last_message"]) if group_info["last_message"] else None,
    }


def format_group_invite(invite: ChatGroupInvite):
    return {
        "id": invite.id,
        "status": invite.status,
        "created_at": format_msg_datetime(invite.created_at),
        "group_id": invite.group_id,
        "group_name": invite.group.name if invite.group else "",
        "inviter": format_user(invite.inviter, include_presence=True),
        "invitee": format_user(invite.invitee, include_presence=True),
    }


@router.get("/friends")
def api_get_friends(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [format_friendship(record, current_user.id) for record in list_friends(db, current_user.id)]


@router.get("/friend-requests")
def api_get_friend_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [format_friend_request(record, current_user.id) for record in list_friend_requests(db, current_user.id)]


@router.get("/group-invites")
def api_get_group_invites(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [format_group_invite(record) for record in list_group_invites(db, current_user.id)]


@router.delete("/friends/{friend_user_id}")
def api_remove_friend(
    friend_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return remove_friend(db, current_user.id, friend_user_id)


@router.post("/friend-requests")
def api_send_friend_request(
    payload: FriendRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = send_friend_request(db, current_user.id, payload.user_id)
    return format_friend_request(record, current_user.id)


@router.post("/friend-requests/{request_id}/accept")
def api_accept_friend_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = respond_to_friend_request(db, request_id, current_user.id, accept=True)
    return format_friend_request(record, current_user.id)


@router.post("/friend-requests/{request_id}/reject")
def api_reject_friend_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    respond_to_friend_request(db, request_id, current_user.id, accept=False)
    return {"status": "success"}


@router.post("/group-invites/{invite_id}/accept")
def api_accept_group_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invite = respond_to_group_invite(db, invite_id, current_user.id, accept=True)
    return format_group_invite(invite)


@router.post("/group-invites/{invite_id}/reject")
def api_reject_group_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invite = respond_to_group_invite(db, invite_id, current_user.id, accept=False)
    return format_group_invite(invite)


@router.post("")
def api_send_message(
    message_in: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = send_message(db=db, sender_id=current_user.id, message_in=message_in)
    return format_message(msg)


@router.get("/unread/count", response_model=dict)
def api_get_unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"unread_count": get_total_unread_count(db=db, user_id=current_user.id)}


@router.get("/conversations")
def api_get_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convs = get_conversations(db=db, user_id=current_user.id, skip=skip, limit=limit)
    for conv in convs:
        conv["with_user"] = format_user(conv["with_user"], include_presence=True)
        conv["last_message"] = format_message(conv["last_message"])
    return convs


@router.get("/groups")
def api_get_groups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [format_group_summary(item, current_user.id) for item in list_groups(db, current_user.id)]


@router.post("/groups")
def api_create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = create_group(db, current_user.id, payload)
    detail = get_group_detail(db, group.id, current_user.id)
    return {
        **format_group_summary(detail, current_user.id),
        "members": [format_user(member, include_presence=True) for member in detail["members"]],
    }


@router.get("/groups/{group_id}")
def api_get_group_detail(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    detail = get_group_detail(db, group_id, current_user.id)
    return {
        **format_group_summary(detail, current_user.id),
        "members": [format_user(member, include_presence=True) for member in detail["members"]],
    }


@router.post("/groups/{group_id}/join")
def api_join_group(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = join_group(db, group_id, current_user.id)
    detail = get_group_detail(db, group.id, current_user.id)
    return {
        **format_group_summary(detail, current_user.id),
        "members": [format_user(member, include_presence=True) for member in detail["members"]],
    }


@router.post("/groups/{group_id}/leave")
def api_leave_group(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return leave_group(db, group_id, current_user.id)


@router.post("/groups/{group_id}/members")
def api_add_group_member(
    group_id: int,
    payload: GroupMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invite = invite_group_member(db, group_id, current_user.id, payload.user_id)
    return format_group_invite(invite)


@router.get("/groups/{group_id}/messages")
def api_get_group_messages(
    group_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = get_group_messages(db, group_id, current_user.id, skip=skip, limit=limit)
    return [format_group_message(msg) for msg in messages]


@router.post("/groups/{group_id}/messages")
def api_send_group_message(
    group_id: int,
    payload: GroupMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = send_group_message(db, group_id, current_user.id, payload)
    return format_group_message(message)


@router.get("/{other_user_id}")
def api_get_messages(
    other_user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mark_messages_as_read(db=db, current_user_id=current_user.id, sender_id=other_user_id)
    messages = get_messages_between_users(
        db=db,
        user1_id=current_user.id,
        user2_id=other_user_id,
        skip=skip,
        limit=limit,
    )
    return [format_message(m) for m in messages]


@router.post("/{other_user_id}/read", response_model=dict)
def api_mark_as_read(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = mark_messages_as_read(db=db, current_user_id=current_user.id, sender_id=other_user_id)
    return {"status": "success", "marked_read_count": count}


@router.delete("/{other_user_id}", response_model=dict)
def api_delete_conversation(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = delete_conversation(db=db, current_user_id=current_user.id, other_user_id=other_user_id)
    return {"status": "success", **result}
