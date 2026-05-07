from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import hashlib
import re
import secrets
import smtplib
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from ..config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_PASSWORD,
    SMTP_FROM,
    SMTP_USE_TLS,
)
from ..models.user import User

import bcrypt

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def is_valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match(normalize_email(email)))


def hash_password(password: str) -> str:
    """使用 bcrypt 直接哈希密码"""
    pwd_bytes = password.encode('utf-8')[:72]  # bcrypt 限制 72 字节
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """验证密码"""
    try:
        return bcrypt.checkpw(plain.encode('utf-8')[:72], hashed.encode('utf-8'))
    except Exception:
        return False


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", 0))
        return user_id if user_id else None
    except (JWTError, ValueError):
        return None


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def create_user(db: Session, username: str, password: str, nickname: str, avatar: str = "eye", email: str | None = None) -> User:
    user = User(
        username=username,
        password_hash=hash_password(password),
        nickname=nickname or username,
        avatar=avatar,
        email=normalize_email(email) if email else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def hash_token(token: str) -> str:
    return hashlib.sha256((token or "").encode("utf-8")).hexdigest()


def create_password_reset_code(user: User) -> str:
    code = f"{secrets.randbelow(1000000):06d}"
    user.password_reset_token_hash = hash_token(code)
    user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    return code


def create_email_verification_code(user: User, email: str) -> str:
    code = f"{secrets.randbelow(1000000):06d}"
    user.pending_email = normalize_email(email)
    user.email_verification_code_hash = hash_token(code)
    user.email_verification_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    return code


def verify_email_code(user: User, email: str, code: str) -> bool:
    if user.pending_email != normalize_email(email):
        return False
    if not user.email_verification_code_hash or not user.email_verification_expires_at:
        return False
    expires_at = user.email_verification_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return False
    return secrets.compare_digest(user.email_verification_code_hash, hash_token(code.strip()))


def reset_password_with_code(db: Session, email: str, code: str, new_password: str) -> User | None:
    user = db.query(User).filter(
        User.email == normalize_email(email),
        User.email_verified == True,
    ).first()
    if not user or not user.password_reset_token_hash or not user.password_reset_expires_at:
        return None
    expires_at = user.password_reset_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    if not secrets.compare_digest(user.password_reset_token_hash, hash_token(code.strip())):
        return None

    user.password_hash = hash_password(new_password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    db.commit()
    db.refresh(user)
    return user


def send_email(to_email: str, subject: str, body: str) -> bool:
    if not SMTP_HOST:
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = SMTP_FROM
    message["To"] = to_email
    message.set_content(body)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
        if SMTP_USE_TLS:
            smtp.starttls()
        if SMTP_USERNAME:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(message)
    return True


def send_password_reset_code(to_email: str, code: str) -> bool:
    return send_email(
        to_email,
        "Password reset code",
        "You requested a password reset.\n\n"
        f"Your verification code is: {code}\n\n"
        "This code expires in 10 minutes.\n\n"
        "If this was not you, you can ignore this email.",
    )


def send_email_verification_code(to_email: str, code: str) -> bool:
    return send_email(
        to_email,
        "Email verification code",
        "You are binding this email to your account.\n\n"
        f"Your verification code is: {code}\n\n"
        "This code expires in 10 minutes. If this was not you, you can ignore this email.",
    )


def search_users(db: Session, keyword: str, limit: int = 10) -> list[User]:
    """通过用户名或昵称搜索用户"""
    if not keyword:
        return []
    term = f"%{keyword}%"
    return db.query(User).filter(
        (User.username.like(term)) | (User.nickname.like(term))
    ).limit(limit).all()
