import logging
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from ..config import SMTP_HOST
from ..database import get_db
from ..dependencies import get_current_user
from ..models.moderation import IpBan
from ..models.user import User
from ..schemas.user import (
    BanUserRequest,
    BindEmail,
    ChangePassword,
    ConfirmEmail,
    ForgotPassword,
    IpBanCreate,
    IpBanResponse,
    ResetPassword,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from ..services.auth import (
    authenticate_user,
    create_access_token,
    create_email_verification_code,
    create_password_reset_code,
    create_user,
    hash_password,
    is_valid_email,
    normalize_email,
    reset_password_with_code,
    search_users,
    send_email_verification_code,
    send_password_reset_code,
    verify_email_code,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["认证"])

auth_limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)


def to_user_response(user: User) -> UserResponse:
    return UserResponse(
        uid=user.id,
        username=user.username,
        nickname=user.nickname,
        avatar=user.avatar or "",
        is_admin=user.is_admin or False,
        is_banned=user.is_banned or False,
        banned_reason=user.banned_reason,
        email=user.email if user.email_verified else None,
    )


def require_admin(user: User):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can do this")


def format_datetime(dt):
    return dt.strftime("%Y-%m-%d %H:%M") if dt else ""


def send_email_verification_code_task(email: str, code: str):
    try:
        return send_email_verification_code(email, code)
    except Exception:
        logger.exception("Failed to send verification email to %s", email)
        return False


def send_password_reset_code_task(email: str, code: str):
    try:
        return send_password_reset_code(email, code)
    except Exception:
        logger.exception("Failed to send password reset email to %s", email)
        return False


def send_email_verification_code_or_raise(email: str, code: str):
    try:
        sent = send_email_verification_code(email, code)
    except Exception:
        logger.exception("Failed to send verification email to %s", email)
        raise HTTPException(status_code=500, detail="验证邮件发送失败，请稍后再试")
    if not sent:
        raise HTTPException(status_code=500, detail="邮件服务未配置，无法发送验证码邮件")


def send_password_reset_code_or_raise(email: str, code: str):
    try:
        sent = send_password_reset_code(email, code)
    except Exception:
        logger.exception("Failed to send password reset email to %s", email)
        raise HTTPException(status_code=500, detail="邮件发送失败，请稍后再试")
    if not sent:
        raise HTTPException(status_code=500, detail="邮件服务未配置，无法发送重置邮件")


@router.post("/register", response_model=TokenResponse)
@auth_limiter.limit("5/minute")
def register(
    request: Request,
    data: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")

    email = normalize_email(data.email or "")
    if email:
        if not is_valid_email(email):
            raise HTTPException(status_code=400, detail="邮箱格式不正确")
        if db.query(User).filter(User.email == email).first():
            raise HTTPException(status_code=400, detail="邮箱已被绑定")

    user = create_user(db, data.username, data.password, data.nickname or data.username, data.avatar)
    if email:
        code = create_email_verification_code(user, email)
        db.commit()
        background_tasks.add_task(send_email_verification_code_task, email, code)

    token = create_access_token(user.id)
    return TokenResponse(token=token, user=to_user_response(user))


@router.post("/login", response_model=TokenResponse)
@auth_limiter.limit("5/minute")
def login(request: Request, data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, data.username, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    if user.is_banned:
        raise HTTPException(status_code=403, detail="该账号已被封禁，请联系管理员。")

    token = create_access_token(user.id)
    return TokenResponse(token=token, user=to_user_response(user))


@router.get("/profile", response_model=UserResponse)
def profile(current_user: User = Depends(get_current_user)):
    return to_user_response(current_user)


@router.put("/change-password")
def change_password(
    data: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="原密码错误")
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"detail": "密码修改成功"}


@router.post("/email/send-code")
@auth_limiter.limit("3/minute")
def send_bind_email_code(
    request: Request,
    data: BindEmail,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="密码错误")

    email = normalize_email(data.email)
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="邮箱格式不正确")

    existing = db.query(User).filter(User.email == email, User.id != current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="邮箱已被绑定")

    code = create_email_verification_code(current_user, email)
    db.commit()

    if not SMTP_HOST:
        raise HTTPException(status_code=500, detail="邮件服务未配置，无法发送验证码邮件")

    send_email_verification_code_or_raise(email, code)
    return {"detail": "验证码已发送，请查看邮箱"}


@router.post("/email/confirm", response_model=UserResponse)
@auth_limiter.limit("5/minute")
def confirm_email(
    request: Request,
    data: ConfirmEmail,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    email = normalize_email(data.email)
    existing = db.query(User).filter(User.email == email, User.id != current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="邮箱已被绑定")
    if not verify_email_code(current_user, email, data.code):
        raise HTTPException(status_code=400, detail="验证码错误或已过期")

    current_user.email = email
    current_user.email_verified = True
    current_user.pending_email = None
    current_user.email_verification_code_hash = None
    current_user.email_verification_expires_at = None
    db.commit()
    db.refresh(current_user)
    return to_user_response(current_user)


@router.post("/forgot-password")
@auth_limiter.limit("3/minute")
def forgot_password(
    request: Request,
    data: ForgotPassword,
    db: Session = Depends(get_db),
):
    email = normalize_email(data.email)
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="邮箱格式不正确")

    generic = {"detail": "如果邮箱已绑定账号，验证码将发送到该邮箱"}
    user = db.query(User).filter(User.email == email, User.email_verified == True).first()
    if not user:
        return generic

    code = create_password_reset_code(user)
    db.commit()

    if not SMTP_HOST:
        raise HTTPException(status_code=500, detail="邮件服务未配置，无法发送重置邮件")

    send_password_reset_code_or_raise(email, code)
    return generic


@router.post("/reset-password")
@auth_limiter.limit("5/minute")
def reset_password(request: Request, data: ResetPassword, db: Session = Depends(get_db)):
    if len(data.new_password) < 4:
        raise HTTPException(status_code=400, detail="新密码至少 4 个字符")

    email = normalize_email(data.email)
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="邮箱格式不正确")

    user = reset_password_with_code(db, email, data.code, data.new_password)
    if not user:
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
    return {"detail": "密码已重置，请重新登录"}


@router.get("/search", response_model=List[UserResponse])
def search(
    q: str = "",
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = search_users(db, q, limit)
    return [to_user_response(u) for u in users]


def apply_user_ban(db: Session, user: User, current_user: User, reason: str | None):
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="不能封禁自己")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="不能封禁管理员")
    user.is_banned = True
    user.banned_reason = reason or "账号已被封禁，请联系管理员。"
    db.commit()
    db.refresh(user)
    return user


@router.post("/admin/users/{user_id}/ban", response_model=UserResponse)
def ban_user(
    user_id: int,
    data: BanUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return to_user_response(apply_user_ban(db, user, current_user, data.reason))


@router.post("/admin/users/ban-by-username", response_model=UserResponse)
def ban_user_by_username(
    data: BanUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    username = (data.username or "").strip()
    if not username:
        raise HTTPException(status_code=400, detail="用户名不能为空")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return to_user_response(apply_user_ban(db, user, current_user, data.reason))


@router.post("/admin/users/{user_id}/unban", response_model=UserResponse)
def unban_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.is_banned = False
    user.banned_reason = None
    db.commit()
    db.refresh(user)
    return to_user_response(user)


@router.get("/admin/ip-bans", response_model=List[IpBanResponse])
def list_ip_bans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    bans = db.query(IpBan).order_by(IpBan.created_at.desc()).all()
    return [
        IpBanResponse(
            id=ban.id,
            ip_address=ban.ip_address,
            reason=ban.reason,
            created_at=format_datetime(ban.created_at),
        )
        for ban in bans
    ]


@router.post("/admin/ip-bans", response_model=IpBanResponse)
def create_ip_ban(
    data: IpBanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    ip_address = data.ip_address.strip()
    if not ip_address:
        raise HTTPException(status_code=400, detail="IP 不能为空")
    ban = db.query(IpBan).filter(IpBan.ip_address == ip_address).first()
    if not ban:
        ban = IpBan(ip_address=ip_address, created_by_id=current_user.id)
        db.add(ban)
    ban.reason = data.reason
    db.commit()
    db.refresh(ban)
    return IpBanResponse(
        id=ban.id,
        ip_address=ban.ip_address,
        reason=ban.reason,
        created_at=format_datetime(ban.created_at),
    )


@router.delete("/admin/ip-bans/{ban_id}")
def delete_ip_ban(
    ban_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    ban = db.query(IpBan).filter(IpBan.id == ban_id).first()
    if not ban:
        raise HTTPException(status_code=404, detail="IP 封禁不存在")
    db.delete(ban)
    db.commit()
    return {"detail": "解除 IP 封禁成功"}
