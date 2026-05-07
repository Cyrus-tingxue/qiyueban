from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.announcement import Announcement
from ..models.user import User
from ..schemas.announcement import AnnouncementResponse, AnnouncementUpdate

router = APIRouter(prefix="/announcement", tags=["announcement"])


def get_or_create_announcement(db: Session) -> Announcement:
    announcement = db.query(Announcement).order_by(Announcement.id.asc()).first()
    if announcement:
        return announcement

    announcement = Announcement(content="")
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


@router.get("", response_model=AnnouncementResponse)
def get_announcement(db: Session = Depends(get_db)):
    announcement = get_or_create_announcement(db)
    return AnnouncementResponse(content=announcement.content or "")


@router.put("", response_model=AnnouncementResponse)
def update_announcement(
    data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can update announcements")

    announcement = get_or_create_announcement(db)
    announcement.content = data.content or ""
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return AnnouncementResponse(content=announcement.content or "")
