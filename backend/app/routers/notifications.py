from datetime import timezone
import zoneinfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.notification import Notification
from ..models.user import User
from ..schemas.notification import NotificationListResponse, NotificationResponse

shanghai_tz = zoneinfo.ZoneInfo("Asia/Shanghai")
router = APIRouter(tags=["notifications"])


def format_datetime(dt):
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(shanghai_tz).strftime("%Y-%m-%d %H:%M")


@router.get("/notifications", response_model=NotificationListResponse)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    query = db.query(Notification).filter(Notification.receiver_id == current_user.id)
    total = query.count()
    unread_count = query.filter(Notification.is_read.is_(False)).count()
    items = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    results = []
    for notif in items:
        sender = db.query(User).filter(User.id == notif.sender_id).first() if notif.sender_id else None
        results.append(NotificationResponse(
            id=notif.id,
            sender_id=notif.sender_id,
            sender_name=notif.sender_name,
            sender_avatar=sender.avatar if sender else notif.sender_avatar,
            type=notif.type,
            target_id=notif.target_id,
            post_id=notif.post_id,
            is_read=notif.is_read,
            created_at=format_datetime(notif.created_at),
        ))

    return NotificationListResponse(
        items=results,
        total=total,
        unread_count=unread_count,
    )


@router.get("/notifications/unread/count")
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unread_count = (
        db.query(Notification)
        .filter(
            Notification.receiver_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .count()
    )
    return {"unread_count": unread_count}


@router.post("/notifications/{notif_id}/read")
def read_notification(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.receiver_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="消息不存在")

    notif.is_read = True
    db.commit()
    return {"detail": "已读"}


@router.post("/notifications/read-all")
def read_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.receiver_id == current_user.id,
        Notification.is_read.is_(False),
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"detail": "全部已读"}


@router.delete("/notifications/clear-all")
def clear_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted_count = db.query(Notification).filter(
        Notification.receiver_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    return {"detail": "已全部清除", "deleted_count": deleted_count}
