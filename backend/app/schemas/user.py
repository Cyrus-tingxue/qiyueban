from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    username: str
    password: str
    nickname: Optional[str] = None
    avatar: Optional[str] = "eye"
    email: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    uid: int
    username: str
    nickname: str
    avatar: str
    is_admin: bool
    is_banned: bool = False
    banned_reason: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class ChangePassword(BaseModel):
    old_password: str
    new_password: str


class BindEmail(BaseModel):
    email: str
    password: str


class ConfirmEmail(BaseModel):
    email: str
    code: str


class ForgotPassword(BaseModel):
    email: str


class ResetPassword(BaseModel):
    email: str
    code: str
    new_password: str


class TokenResponse(BaseModel):
    token: str
    user: UserResponse


class BanUserRequest(BaseModel):
    reason: Optional[str] = None
    username: Optional[str] = None
    user_id: Optional[int] = None


class IpBanCreate(BaseModel):
    ip_address: str
    reason: Optional[str] = None


class IpBanResponse(BaseModel):
    id: int
    ip_address: str
    reason: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True
