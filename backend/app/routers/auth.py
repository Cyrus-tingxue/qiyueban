from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..database import get_db
from ..schemas.user import (
    UserCreate,
    UserLogin,
    TokenResponse,
    UserResponse,
    ChangePassword,
    BindEmail,
    ConfirmEmail,
    ForgotPassword,
    ResetPassword,
)
from ..services.auth import (
    authenticate_user,
    create_user,
    create_access_token,
    verify_password,
    hash_password,
    normalize_email,
    is_valid_email,
    create_password_reset_code,
    send_password_reset_code,
    reset_password_with_code,
    create_email_verification_code,
    verify_email_code,
    send_email_verification_code,
)
from ..dependencies import get_current_user
from ..models.user import User

router = APIRouter(prefix="/auth", tags=["认证"])

# 认证端点专用限流器：每分钟 5 次（防暴力破解）
auth_limiter = Limiter(key_func=get_remote_address)


def to_user_response(user: User) -> UserResponse:
    return UserResponse(
        uid=user.id,
        username=user.username,
        nickname=user.nickname,
        avatar=user.avatar or "",
        is_admin=user.is_admin or False,
        email=user.email if user.email_verified else None,
    )


@router.post("/register", response_model=TokenResponse)
@auth_limiter.limit("5/minute")
def register(request: Request, data: UserCreate, db: Session = Depends(get_db)):
    # 检查用户名是否已存在
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
        try:
            send_email_verification_code(email, code)
        except Exception:
            pass
    token = create_access_token(user.id)
    return TokenResponse(
        token=token,
        user=to_user_response(user),
    )


@router.post("/login", response_model=TokenResponse)
@auth_limiter.limit("5/minute")
def login(request: Request, data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, data.username, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token(user.id)
    return TokenResponse(
        token=token,
        user=to_user_response(user),
    )


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

    try:
        sent = send_email_verification_code(email, code)
    except Exception:
        raise HTTPException(status_code=500, detail="验证邮件发送失败，请稍后再试")
    if not sent:
        raise HTTPException(status_code=500, detail="邮件服务未配置，无法发送验证邮件")

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
def forgot_password(request: Request, data: ForgotPassword, db: Session = Depends(get_db)):
    email = normalize_email(data.email)
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="邮箱格式不正确")

    generic = {"detail": "如果邮箱已绑定账号，验证码将发送到该邮箱"}
    user = db.query(User).filter(User.email == email, User.email_verified == True).first()
    if not user:
        return generic

    code = create_password_reset_code(user)
    db.commit()

    try:
        sent = send_password_reset_code(email, code)
    except Exception:
        raise HTTPException(status_code=500, detail="邮件发送失败，请稍后再试")

    if not sent:
        raise HTTPException(status_code=500, detail="邮件服务未配置，无法发送重置邮件")
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


from typing import List

@router.get("/search", response_model=List[UserResponse])
def search(
    q: str = "",
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from ..services.auth import search_users
    users = search_users(db, q, limit)
    return [
        to_user_response(u) for u in users
    ]
