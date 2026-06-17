from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AppVersionBase(BaseModel):
    version_code: int
    version_name: str
    download_url: str
    update_log: str
    force_update: bool = False

class AppVersionCreate(AppVersionBase):
    pass

class AppVersionUpdate(BaseModel):
    version_code: Optional[int] = None
    version_name: Optional[str] = None
    download_url: Optional[str] = None
    update_log: Optional[str] = None
    force_update: Optional[bool] = None

class AppVersionResponse(AppVersionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
