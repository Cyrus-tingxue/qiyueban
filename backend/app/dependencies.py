from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models.user import User
from .services.auth import decode_token

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)
LAST_SEEN_WRITE_INTERVAL = timedelta(seconds=30)


def touch_user_last_seen(db: Session, user: User):
    now = datetime.now(timezone.utc)
    if not user.last_seen_at:
        user.last_seen_at = now
        db.commit()
        return

    last_seen = user.last_seen_at
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)

    if now - last_seen >= LAST_SEEN_WRITE_INTERVAL:
        user.last_seen_at = now
        db.commit()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的认证令牌")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")

    touch_user_last_seen(db, user)
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(optional_security),
    db: Session = Depends(get_db),
):
    if not credentials:
        return None

    token = credentials.credentials
    user_id = decode_token(token)
    if not user_id:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        touch_user_last_seen(db, user)
    return user
